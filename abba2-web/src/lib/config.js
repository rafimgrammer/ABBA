// 서비스 상수와 계산 가정값. 숫자를 바꾸려면 여기만 고친다.
// [가정] 2026-08 기준. 본 구현에서는 금융감독원 공시 API 값으로 대체한다.

// 버전은 package.json 하나가 출처다. vite.config.js가 __APP_VERSION__으로 주입한다.
// typeof 가드가 있어야 Vite 밖(Node로 lib을 직접 돌려 검산할 때)에서도 깨지지 않는다.
export const APP = { name: 'ABBA 2.0', version: typeof __APP_VERSION__ === 'undefined' ? 'dev' : __APP_VERSION__, stage: '시안 · 팀 공유판' };

export const M = 10000; // 만 원 → 원

// 연 수익률(세전). 적금만 단리, 나머지는 월복리.
export const RATES = { 적금: 0.035, 예금: 0.032, 채권: 0.040, 주식: 0.075 };
export const TAX = 0.154;                       // 이자·배당소득세
export const KEYS = ['적금', '예금', '채권', '주식'];

// 목표 종류 라벨. 화면과 AI 프롬프트가 같은 말을 쓰도록 여기 둔다.
export const GOAL_LABEL = { house: '집 사기', lump: '목돈 모으기', item: '사고 싶은 물건', none: '그냥 재테크' };
// 성향별 기본 배분(%) — 적금·예금·채권·주식
export const BASE = { 안정형: [50, 30, 15, 5], 중립형: [35, 15, 20, 30], 공격형: [20, 10, 15, 55] };
export const LTV = 0.70, LOAN_RATE = 0.040, LOAN_YEARS = 30; // 집 목표 대출 가정

// 입력 한계 — 음수·0·비현실적 값 차단에 쓴다
export const LIMITS = {
  months: { min: 1, max: 600 },
  amount: { min: 10 * M },          // 목표 금액
  house:  { min: 1000 * M },        // 집값
  income: { min: 10 * M, max: 100000 * M },
  money:  { min: 0, max: 100000 * M },
  digits: 9,
};

// 화면 목록 시트에 노출할 팀 문서
export const DOCS = [
  { title: '우승 전략 · 9일 계획', desc: '결정 6개 · 역할 · 일정 · 제출 체크', url: 'https://claude.ai/code/artifact/f4e1575b-b190-4717-a29b-4b65f5745a1e' },
  { title: '기획서 v3', desc: '공식 7항목 · 노란 표시 기입 필요', url: 'https://claude.ai/code/artifact/6426b5aa-26b0-47b4-a4d0-4d067f4a18a9' },
  { title: '기능명세서 초안', desc: '기능 36개', url: 'https://claude.ai/code/artifact/4ed3c481-63ea-47cc-80d9-18a0d550d402' },
  { title: '데이터 모델 v1.1', desc: '19개 테이블 · RLS · 파이프라인', url: 'https://claude.ai/code/artifact/03a1e7ac-970f-448b-8dc9-2c98fdc03ee6' },
];
