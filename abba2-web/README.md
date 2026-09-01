# ABBA 2.0 — 프론트엔드 시안 (v2.0 · React)

묻기 전에 먼저 알려주는 AI 재테크 코치. 2026 금융 AI Challenge 출품작의 화면 시안이다.
**프론트엔드만 있는 단계다.** 로그인·저장·실데이터·AI 문장은 백엔드 단계에서 붙인다.

- 계산(배분·예상 수익·부족분·대출)은 실제로 동작한다 — `src/lib/engine.js`
- AI 문장은 템플릿이고, 브리핑의 시세·뉴스·상품은 예시 데이터다
- 상태는 메모리에만 있다. 새로고침하면 사라진다

## v2.0 — React 전환

v1.3까지는 문자열 템플릿 + 인라인 `onclick` + `innerHTML` 통째 교체 방식이었다.
v2.0에서 **React 19 + Vite**로 옮겼다. 화면 동작과 계산 결과는 그대로다(UI 테스트 101항목 전부 통과).

| | v1.3 (vanilla) | v2.0 (React) |
|---|---|---|
| 화면 | 템플릿 문자열 → `app.innerHTML` | 컴포넌트 트리 |
| 이벤트 | 인라인 `onclick` + `window`에 함수 노출 | JSX 이벤트 핸들러 (`main.js`가 사라졌다) |
| 상태 | 전역 `S` + `render()` 직접 호출 | 전역 `S` + `update()` → `useSyncExternalStore` |
| 라우팅 | 해시 라우터 (직접 구현) | 해시 라우터 (`useRoute` 훅) — react-router 안 씀 |
| 입력칸 | DOM을 직접 만지는 `live()` | 제어 컴포넌트 `NumField` |
| XSS 방어 | `esc()` 수동 호출 | React가 기본 이스케이프 |
| 빌드 | `build.py` (문자열 이어붙이기) | Vite + `vite-plugin-singlefile` |

상태 모델은 일부러 그대로 뒀다. 전역 `S`를 제자리에서 고치고 `update()`로 통지하는 방식이라,
`state.js`·`plan.js`의 액션 코드를 거의 손대지 않고 옮길 수 있었다. 나중에 서버 상태가 붙으면
그때 스토어를 쪼개면 된다.

전환하면서 고친 버그 하나: 집 목표 질문 문구가 작은따옴표 안에 `${...}`로 적혀 있어
LTV 비율이 계산되지 않고 그대로 화면에 나오고 있었다 (`src/lib/questions.js`).

## 열어보기

```bash
npm install
```

```bash
# 1) 코드 고치며 보기 — HMR
npm run dev

# 2) 그냥 보기 — 빌드된 단일 파일을 더블클릭
npm run build && open dist/abba2.html
```

`dist/abba2.html`은 CSS·JS가 전부 인라인된 단일 파일이라 서버 없이 `file://`로 열린다
(그래서 번들을 module이 아니라 IIFE로 뽑는다). 팀 공유·시연은 이 파일을 쓴다.
`dist/abba2.artifact.html`은 문서 래퍼가 없는 Claude 아티팩트 게시용이다.

## 폴더 구조 — 기능별로 나눠 놓았다

```
src/styles/
  tokens.css        색 토큰. 팀컬러 변경은 여기 --p 계열만
  base.css          리셋·프레임·상단 띠·헤더
  components.css    카드·버튼·CTA·탭바·배지·시트·토스트
  screens.css       화면별 스타일(시작·대화·계획·브리핑·설정)

src/lib/            화면과 무관한 순수 로직 — React가 없어도 돌아간다
  config.js         가정 수익률·세율·LTV·입력 한계·문서 링크   ← 숫자를 바꾸려면 여기만
  utils.js          숫자·통화·날짜 포맷
  icons.js          Lucide 라인 아이콘 path 데이터 (이모지 금지)
  engine.js         계산 엔진 — 배분·예상 수익·도달 개월·조정안·대출
  questions.js      대화 질문·선택지·확인 문구                  ← 문구를 바꾸려면 여기만
  validate.js       입력 파싱·검증 (음수·기호 차단)

src/components/
  Icon.jsx          아이콘
  Chrome.jsx        상단 띠·헤더·탭바·화면 목록 시트·토스트
  NumField.jsx      숫자 입력칸 (파싱·검증·캐럿 복원)

src/screens/        Start · Chat · Plan · Brief · Data · Settings
src/store.js        전역 상태, 목적 설정 진행도, 예시 값 채우기
src/routing.js      해시 라우터
src/App.jsx         라우팅 진입점
src/main.jsx        부팅

vite.config.js      단일 파일 빌드 (dist/abba2.html · dist/abba2.artifact.html)
tests/              UI 테스트(101) · 파이썬 대조 엔진
```

화면과 파일은 1:1이다. 브리핑 카드를 고치려면 `screens/Brief.jsx`, 질문 순서를 바꾸려면
`store.js`의 `ORDER`와 `lib/questions.js`만 보면 된다.

## 테스트

```bash
pip install playwright && playwright install chromium
```

```bash
npm run build && python3 tests/test_ui.py         # dist 단일 파일 기준 101항목
```

```bash
npm run dev                                        # 다른 터미널에서
python3 tests/test_ui.py src                       # 개발 서버 기준 99항목
```

`tests/engine_ref.py`는 화면 엔진과 같은 규칙을 파이썬으로 다시 구현한 것이다. 계산값이 어긋나면 테스트가 잡는다.

검증 기준값 (중립형 · 월 90만 · 3,000만 원 · 24개월 · 모아둔 돈 0)
예상 총액 2,248만 원 · 원금 2,160만 원 · 수익 88만 원 · 부족 752만 원 · 기간안 32개월 · 금액안 121만 원

v1.3의 `tests/check_imports.py`는 없앴다. 단일 스코프로 이어붙이던 빌드에서만 나던 실수인데,
Vite가 진짜 ES 모듈을 해석하므로 임포트를 빼먹으면 빌드가 바로 터진다.

## 음수 입력 3중 방어 (v1.3에서 추가, v2.0에서 그대로)

| 층 | 위치 | 하는 일 |
|---|---|---|
| 1 | `lib/validate.js` `keyHint` → `NumField`의 `onKeyDown` | 숫자가 아닌 글자키(`-` 포함)를 아예 못 누르게 한다 |
| 2 | `lib/validate.js` `parseNum` | 붙여넣기·드롭·IME로 들어온 값에서 숫자만 남기고, 무엇을 걸렀는지 알려준다 |
| 3 | `lib/validate.js` `validate` | 0 이하·범위 밖(수입 10만 원 미만, 10억 원 초과 등)을 거부한다 |
| 방어 | `lib/engine.js` `project` | 어떤 경로로든 음수가 들어오면 0으로 막고 계산한다 |

`validate.js`는 이제 DOM을 만지지 않는 순수 함수다. 캐럿 복원만 `NumField`가 맡는다.

## 규칙

- **이모지 금지.** 라벨·버튼·탭·카드·시트 어디에도 쓰지 않는다. 아이콘은 Lucide 라인(24×24, 2px stroke)만
- 숫자는 코드가 만든다. AI는 문장만 쓴다 (백엔드 단계에서 검증 루프가 붙는다)
- 입력 필드는 입력할 때마다 도움말·CTA 상태를 갱신하고, 콤마를 다시 붙일 때 캐럿을 보존한다
- 런타임 의존은 React·ReactDOM과 웹폰트 하나뿐이다. UI 라이브러리·라우터를 추가하지 않는다

## 다음 단계

1. 백엔드: Supabase(익명 로그인 → 매직링크, 19개 테이블, RLS) · `0001_init.sql` 실행
2. Claude 연결: 대화 추출 · 계획 설명 · 뉴스 분류 · 브리핑 문장 + 숫자 검증
3. 실데이터 배치: 금융감독원 공시 · 한국은행 ECOS · KRX 시세 · 뉴스
4. 시안 v2 화면: 진행 그래프 · 월간 결산 · 할 일 체크 · 카드 반응 · 이어하기

`legacy/`에 v1.3 vanilla 원본(`src/js`, `build.py`, `index.html`)을 그대로 남겨 뒀다. 대조가 끝나면 지워도 된다.

팀 문서(전략·기획서·기능명세서·데이터 모델)는 앱의 "화면 목록" 시트 하단 링크에 있다.
