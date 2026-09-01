# A.FECT SAJU

사내용 사주 프로토타입 2종 + Gemini 연동용 백엔드입니다.

## 파일 구성

```
my-saju.html          MY SAJU — 개인 사주 결과 페이지 (그대로 열면 동작)
team-seating.html     TEAM 대기실 — 자리배치 / 행운 아이템 / 파국 조합 (그대로 열면 동작, 단 AI 문구는 fallback)
server.js             Gemini API 백엔드 (POST /api/saju-copy) — 별도 배포 필요
package.json          server.js 의존성
.env.example          환경변수 템플릿 (실제 키는 여기 적지 마세요)
.gitignore            node_modules, .env 등 제외
```

## 지금 상태로 바로 되는 것

`my-saju.html`, `team-seating.html`은 그냥 브라우저에서 열기만 해도 전부 동작합니다.
사주 계산, 좌석 배치 알고리즘, 궁합/파국 점수 계산은 전부 순수 JS로 파일 안에 들어있어서
백엔드 없이도 정상 작동합니다.

다만 `team-seating.html`의 말풍선/카드 설명 문구는 지금 상태에서는 **항상 규칙 기반
fallback 문구**로 나옵니다. 실제 Gemini가 생성한 문구를 쓰려면 아래 백엔드를 배포해야 합니다.

## Gemini 백엔드 배포 (선택사항)

### 1. 로컬에서 먼저 테스트

```bash
npm install
cp .env.example .env
# .env 파일을 열어서 GEMINI_API_KEY=your_gemini_api_key_here 를 실제 키로 교체
npm start
```

`http://localhost:3000/api/saju-copy` 로 POST 요청이 오면 Gemini를 호출하도록 되어 있습니다.

### 2. 실제 서버에 배포

Render, Railway, Fly.io 등 Node.js를 계속 띄워둘 수 있는 곳에 이 레포를 그대로 배포하고,
호스팅 서비스의 "Environment Variables" 설정에 `GEMINI_API_KEY`를 등록하세요.
**키를 코드나 .env 파일 형태로 GitHub에 커밋하지 마세요** (`.gitignore`에 `.env`는 이미 제외되어 있습니다).

> Vercel처럼 서버리스 함수 방식을 쓰는 곳에 배포하려면 `server.js`를 `api/saju-copy.js` 형태로
> 옮기고 `app.listen()` 대신 요청 핸들러 함수를 `export default`하는 구조로 바꿔야 합니다.
> 지금 구조는 Render/Railway/Fly.io처럼 계속 떠 있는 서버 기준입니다.

### 3. 프론트에 배포 주소 연결

`team-seating.html` 상단에서 아래 줄을 찾아 배포한 서버 주소로 바꿔주세요.

```js
const API_BASE = ''; // 예: 'https://your-backend.onrender.com'
```

프론트(`team-seating.html`)와 백엔드를 같은 도메인에서 서빙한다면 빈 문자열로 둬도 됩니다.

### 4. 실제로 Gemini가 응답하는지 확인하는 방법

- 브라우저 개발자 콘솔에 `[AI COPY] Gemini success`가 찍히면 성공, `[AI COPY] Fallback used`가
  찍히면 아직 fallback입니다.
- 브라우저 개발자도구 Network 탭에서 `POST /api/saju-copy` 요청이 200으로 오는지 확인하세요.
- 배포한 서버 로그에 `Gemini response received`가 찍히는지 확인하세요.

## 알려진 제한사항

- TEAM 대기실의 멤버 목록은 브라우저 메모리에만 있습니다. 새로고침하거나 다른 사람이 다른
  브라우저로 열면 공유되지 않습니다. 실시간 공용 대기실을 원하시면 Firebase Firestore나
  Supabase 같은 실시간 DB 연동이 별도로 필요하고, 이건 프로젝트를 새로 만들고 설정값을
  공유해주셔야 다음 단계로 진행할 수 있습니다.
- 좌석 배치 계산, 궁합 지수, 파국 조합 선정은 전부 규칙 기반 결정론적 로직입니다. Gemini는
  이미 계산된 결과를 재치있는 문장으로 바꾸는 역할만 하고, 배치나 점수 자체를 생성하지 않습니다.
