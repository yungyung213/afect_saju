// server.js
//
// team-seating.html이 호출하는 POST /api/saju-copy 엔드포인트의 실제 구현입니다.
// Render, Railway, Fly.io처럼 계속 떠 있는(always-on) Node 서버 호스팅에 맞춘 구조입니다.
// (Vercel처럼 서버리스 함수 기반 호스팅을 쓰신다면 이 파일을 api/saju-copy.js 형태로
//  옮기고 app.listen() 대신 핸들러 함수를 export 하는 방식으로 바꿔야 합니다.)
//
// 로컬 실행 방법:
//   npm install
//   cp .env.example .env         # .env 파일을 만들고 GEMINI_API_KEY를 실제 값으로 채우기
//   npm start
//
// 배포 시: 호스팅 서비스의 "Environment Variables" 설정에 GEMINI_API_KEY를 등록하세요.
// GEMINI_API_KEY는 이 파일이나 .env 파일이나, 절대 GitHub에 커밋되는 파일에 직접 적지 마세요.
// (.env는 .gitignore에 이미 포함되어 있습니다.)
//
// 배포 후에는 team-seating.html 상단의 API_BASE 상수를 이 서버의 실제 배포 주소로
// 바꿔주세요. 예: const API_BASE = 'https://your-backend.onrender.com';

const express = require('express');
require('dotenv').config();
const app = express();
app.use(express.json());

// GitHub Pages(다른 도메인)에서 이 서버로 보내는 요청을 브라우저가 막지 않도록 허용합니다.
// 필요하면 '*' 대신 실제 프론트 주소만 허용하도록 좁힐 수 있습니다.
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-3.6-flash'; // Google 안내에 따라 gemini-2.0-flash에서 교체 (2026-09 기준)

if (!GEMINI_API_KEY) {
  console.warn('[WARN] GEMINI_API_KEY 환경변수가 설정되지 않았습니다. 모든 요청이 실패로 처리됩니다.');
}

app.post('/api/saju-copy', async (req, res) => {
  const { feature, analysis_basis, system_prompt, members, facts } = req.body || {};

  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured on server' });
  }
  if (!feature || !members || !facts) {
    return res.status(400).json({ error: 'missing required fields (feature, members, facts)' });
  }

  const userPrompt = `
feature: ${feature}
analysis_basis: ${analysis_basis}
members: ${JSON.stringify(members)}
계산된 사실(facts) — 이 데이터에서 벗어나지 말고, 이 사실만을 근거로 재치있게 풀어써줘:
${JSON.stringify(facts)}

아래 JSON 형식으로만 응답해. 다른 텍스트, 코드펜스 없이 JSON만 출력해:
{"headline":"", "summary":"", "detail":""}
`.trim();

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: system_prompt || '' }] },
          contents: [{ parts: [{ text: userPrompt }] }],
          generationConfig: { temperature: 0.9, maxOutputTokens: 500 },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('[Gemini API error]', geminiRes.status, errText);
      return res.status(502).json({ error: 'Gemini API request failed' });
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleaned = rawText.replace(/```json|```/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error('[Gemini response parse error]', rawText);
      return res.status(502).json({ error: 'could not parse Gemini response as JSON' });
    }

    if (!parsed.headline) {
      return res.status(502).json({ error: 'Gemini response missing headline' });
    }

    console.log('Gemini response received —', feature, analysis_basis);
    return res.json(parsed);
  } catch (e) {
    console.error('[Backend error]', e);
    return res.status(500).json({ error: 'internal server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`saju-copy backend listening on port ${PORT}`));
