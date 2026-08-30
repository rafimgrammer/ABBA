# ABBA 2.0 — 프론트엔드 시안 (v1.3)

묻기 전에 먼저 알려주는 AI 재테크 코치. 2026 금융 AI Challenge 출품작의 화면 시안이다.
**프론트엔드만 있는 단계다.** 로그인·저장·실데이터·AI 문장은 백엔드 단계에서 붙인다.

- 계산(배분·예상 수익·부족분·대출)은 실제로 동작한다 — `src/js/engine.js`
- AI 문장은 템플릿이고, 브리핑의 시세·뉴스·상품은 예시 데이터다
- 상태는 메모리에만 있다. 새로고침하면 사라진다

## 열어보기

```bash
# 1) 그냥 보기 — 빌드된 단일 파일을 더블클릭
open dist/abba2.html

# 2) 코드 고치며 보기 — 모듈을 그대로 읽으므로 로컬 서버가 필요하다
python3 -m http.server 8000     # 또는 npx serve .
# http://localhost:8000/index.html

# 3) 고친 뒤 단일 파일 다시 만들기 (dist/도 함께 커밋한다)
python3 build.py
```

`index.html`은 ES 모듈을 불러오므로 `file://`로 직접 열면 브라우저가 막는다. 서버 없이 볼 때는 `dist/abba2.html`을 쓴다.

## 폴더 구조 — 기능별로 나눠 놓았다

```
src/styles/
  tokens.css        색 토큰. 팀컬러 변경은 여기 --p 계열만
  base.css          리셋·프레임·상단 띠·헤더
  components.css    카드·버튼·CTA·탭바·배지·시트·토스트
  screens.css       화면별 스타일(시작·대화·계획·브리핑·설정)

src/js/
  config.js         가정 수익률·세율·LTV·입력 한계·문서 링크   ← 숫자를 바꾸려면 여기만
  utils.js          숫자·통화·날짜 포맷, DOM 헬퍼
  icons.js          Lucide 라인 아이콘 인라인 SVG (이모지 금지)
  engine.js         계산 엔진 — 배분·예상 수익·도달 개월·조정안·대출
  state.js          전역 상태, 목적 설정 진행도, 예시 값 채우기
  questions.js      대화 질문·선택지·확인 문구                  ← 문구를 바꾸려면 여기만
  validate.js       입력 파싱·검증 (음수·기호 차단)
  ui.js             상단 띠·헤더·탭바·화면 목록 시트·토스트
  router.js         해시 라우터와 렌더 진입점
  screens/          start · chat · plan · brief · data · settings
  main.js           부팅. 인라인 onclick이 부르는 함수만 window에 노출

build.py            src → dist 단일 파일 빌드
tests/              UI 테스트(101) · 임포트 검사 · 파이썬 대조 엔진
```

화면과 파일은 1:1이다. 브리핑 카드를 고치려면 `screens/brief.js`, 질문 순서를 바꾸려면 `state.js`의 `ORDER`와 `questions.js`만 보면 된다.

## 테스트

```bash
pip install playwright && playwright install chromium
python3 tests/check_imports.py     # 모듈 임포트 누락 (단일 파일에서는 안 걸리는 실수)
python3 tests/test_ui.py           # dist 기준 101항목
python3 tests/test_ui.py src       # 모듈 기준 99항목 (로컬 서버 먼저 띄울 것)
```

`tests/engine_ref.py`는 화면 엔진과 같은 규칙을 파이썬으로 다시 구현한 것이다. 계산값이 어긋나면 테스트가 잡는다.

검증 기준값 (중립형 · 월 90만 · 3,000만 원 · 24개월 · 모아둔 돈 0)
예상 총액 2,248만 원 · 원금 2,160만 원 · 수익 88만 원 · 부족 752만 원 · 기간안 32개월 · 금액안 121만 원

## v1.3에서 고친 것 — 음수 입력

수입·금액 칸에 음수가 들어가던 문제를 3중으로 막았다.

| 층 | 파일 | 하는 일 |
|---|---|---|
| 1 | `validate.js` `onNumKey` | 숫자가 아닌 글자키(`-` 포함)를 아예 못 누르게 한다. "음수는 입력할 수 없어요"를 띄운다 |
| 2 | `validate.js` `parseNum` | 붙여넣기·드롭·IME로 들어온 값에서 숫자만 남기고, 무엇을 걸렀는지 알려준다 |
| 3 | `validate.js` `validate` | 0 이하·범위 밖(수입 10만 원 미만, 10억 원 초과 등)을 거부한다 |
| 방어 | `engine.js` `project` | 어떤 경로로든 음수가 들어오면 0으로 막고 계산한다 |

저축 가능액(`수입 − 지출`)도 음수가 되지 않게 `Math.max(0, …)`으로 잡았다. 회귀 테스트는 `tests/test_ui.py`의 "음수·기호 차단" 절에 있다.

## 규칙

- **이모지 금지.** 라벨·버튼·탭·카드·시트 어디에도 쓰지 않는다. 아이콘은 Lucide 라인(24×24, 2px stroke)만
- 숫자는 코드가 만든다. AI는 문장만 쓴다 (백엔드 단계에서 검증 루프가 붙는다)
- 입력 필드는 입력할 때마다 도움말·CTA 상태를 갱신하고, 콤마를 다시 붙일 때 캐럿을 보존한다
- 외부 의존은 웹폰트 하나뿐이다. 라이브러리를 추가하지 않는다

## 다음 단계

1. 백엔드: Supabase(익명 로그인 → 매직링크, 19개 테이블, RLS) · `0001_init.sql` 실행
2. Claude 연결: 대화 추출 · 계획 설명 · 뉴스 분류 · 브리핑 문장 + 숫자 검증
3. 실데이터 배치: 금융감독원 공시 · 한국은행 ECOS · KRX 시세 · 뉴스
4. 시안 v2 화면: 진행 그래프 · 월간 결산 · 할 일 체크 · 카드 반응 · 이어하기

팀 문서(전략·기획서·기능명세서·데이터 모델)는 앱의 "화면 목록" 시트 하단 링크에 있다.
