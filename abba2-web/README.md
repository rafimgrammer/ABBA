# ABBA 2.0

목표·기간·월 저축액·투자 성향을 입력하면 자산 배분과 예상 금액을 계산해 주는 React 기반 금융 계획 시안입니다.

## 현재 제공 범위

- 목표 설정 대화와 투자 계획 계산
- 계획 설명·질문 답변을 위한 Gemini 호출
- 랜딩 페이지와 반응형 앱 화면
- 브리핑·시세·뉴스·계좌 연동 화면은 예시 데이터와 UI 시안

현재는 프런트엔드 중심 프로젝트입니다. Google OAuth 로그인, 사용자별 데이터 저장, 은행·증권 계좌 연동은 구현돼 있지 않습니다.

## 요구 사항

- Node.js 20 이상
- npm

## 시작하기

```bash
cd abba2-web
npm install
npm run dev
```

개발 서버 주소는 터미널에 표시됩니다. 보통 [http://localhost:5173](http://localhost:5173)입니다.

## Gemini API 설정

AI 계획과 질문 답변을 사용하려면 Gemini API 키가 필요합니다.

1. [Google AI Studio](https://aistudio.google.com/apikey)에서 API 키를 발급합니다.
2. 아래처럼 `.env.local` 파일을 만듭니다. 이 파일은 Git에서 제외됩니다.

```bash
cp .env.example .env.local
```

3. `.env.local`에 키를 입력합니다.

```env
VITE_GEMINI_API_KEY=여기에_API_키
```

4. 개발 서버를 다시 시작합니다.

또는 앱의 **설정 → AI 상세 계획 → 키 넣기**에서 브라우저별 개인 키를 입력할 수 있습니다.

> `VITE_`로 시작하는 값은 브라우저 번들에 포함됩니다. 현재 구조에서는 데모용 키만 사용하고, 실제 배포에서는 Gemini 호출을 서버로 옮겨야 합니다.

## 빌드

```bash
npm run build
```

`dist/abba2.html`은 단일 HTML 산출물입니다. API 키를 안전하게 유지해야 하는 서비스 배포에는 파일을 직접 공유하지 말고 인증된 서버를 추가하세요.

## 테스트

```bash
pip install playwright
playwright install chromium
npm run build
python3 tests/test_ui.py
```

## 주요 폴더

```text
src/
  components/  공통 UI 컴포넌트
  screens/     화면 단위 컴포넌트
  lib/         계산 엔진, Gemini 호출, 입력 검증
  styles/      전역·화면 스타일
  store.js     화면 상태
tests/         UI·계산 검증
```

## Git revert 충돌 복구

`git revert` 중 `unmerged files` 오류가 나면 먼저 현재 상태를 확인합니다.

```bash
git status
```

되돌리기를 계속하려면 충돌 표시(`<<<<<<<`, `=======`, `>>>>>>>`)를 각 파일에서 해결한 뒤 다음을 실행합니다.

```bash
git add abba2-web/package-lock.json abba2-web/src/screens/Home.jsx abba2-web/src/store.js
git revert --continue
```

되돌리기 자체를 취소하고, revert를 시작하기 전 작업 상태로 돌아가려면 다음을 실행합니다.

```bash
git revert --abort
```

충돌이 남은 동안에는 새 커밋·revert·merge를 진행하지 않는 것이 안전합니다.
