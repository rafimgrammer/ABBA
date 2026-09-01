// 숫자 입력의 파싱·검증. 음수와 기호는 이 파일에서 전부 막는다.
//
// 3중 방어 (React 전환 후에도 층은 그대로다)
//   1) keyHint   — 숫자가 아닌 글자키를 아예 못 누르게 한다(마이너스 포함). NumField의 onKeyDown
//   2) parseNum  — 붙여넣기·드롭·IME로 들어온 값에서 숫자만 남기고, 무엇을 걸렀는지 알려준다
//   3) validate  — 0 이하·범위 밖 값을 거부하고 이유를 화면에 띄운다
// 엔진(engine.js)에도 마지막 방어가 있어, 어떤 경로로도 음수가 계산에 들어가지 않는다.
//
// vanilla 판과 달리 이 파일은 DOM을 만지지 않는다. 입력 문자열을 받아 문자열을 돌려주는
// 순수 함수라서, 캐럿 복원은 NumField가 useLayoutEffect에서 처리한다.
import { M, LIMITS, LTV } from './config.js';
import { fmt, won, ymAdd } from './utils.js';
import { S } from '../store.js';

const MINUS = /[-−–—+]/;              // 하이픈·유니코드 마이너스·전각 부호·플러스
const NOT_DIGIT_OR_COMMA = /[^\d,]/;

/** 눌린 글자키를 받아, 막아야 하면 거절 사유를 돌려준다. 통과시킬 키면 null. */
function keyHint(key) {
  if (key.length !== 1) return null;            // Backspace, Arrow, Tab …
  if (/[0-9]/.test(key)) return null;
  return MINUS.test(key) ? 'negative' : 'char';
}

/** beforeinput의 data(붙여넣기·IME 조합 등)에서 거절 사유를 뽑는다. 없으면 null. */
function dataHint(data) {
  if (typeof data !== 'string' || !NOT_DIGIT_OR_COMMA.test(data)) return null;
  return MINUS.test(data) ? 'negative' : 'char';
}

// 입력값에서 숫자만 남기고 콤마를 다시 붙인다. 캐럿은 앞쪽 숫자 개수로 복원한다.
// 반환: { text, n, rejected, caret } — rejected는 'negative' | 'char' | null
function parseNum(raw, pos = raw.length, hint = null) {
  const digitsBefore = raw.slice(0, pos).replace(/\D/g, '').length;
  const digits = raw.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, LIMITS.digits);
  const text = digits ? fmt(Number(digits)) : '';
  let rejected = hint;
  if (!rejected && NOT_DIGIT_OR_COMMA.test(raw)) rejected = MINUS.test(raw) ? 'negative' : 'char';
  let caret = text.length, c = 0, i = 0;
  while (i < text.length && c < digitsBefore) { if (/\d/.test(text[i])) c++; i++; }
  if (text !== raw) caret = i;
  return { text, n: digits ? Number(digits) : null, rejected, caret };
}

const REJECT_MSG = { negative: '음수는 입력할 수 없어요', char: '숫자만 입력할 수 있어요' };
const ZERO_OK = ['lump', 'expense'];   // 0을 허용하는 질문(모아둔 돈 없음, 지출 0)

function validate(q, n, rejected) {
  const a = S.a;
  if (rejected && n == null) return { ok: false, msg: REJECT_MSG[rejected] };
  if (n == null) return { ok: false, msg: q.unit === '개월' ? '숫자만 입력' : '만 원 단위로 입력' };

  if (q.unit === '개월') {
    if (n < LIMITS.months.min) return { ok: false, msg: `${LIMITS.months.min}개월 이상이어야 해요` };
    if (n > LIMITS.months.max) return { ok: false, msg: `${LIMITS.months.max}개월(50년) 이하로 입력해 주세요` };
    return { ok: true, msg: `${fmt(n)}개월 = ${ymAdd(n - 1)}까지`, warn: REJECT_MSG[rejected] };
  }

  const v = n * M;
  if (v <= 0 && !ZERO_OK.includes(q.id)) return { ok: false, msg: '0보다 큰 금액을 입력해 주세요' };
  if (v > LIMITS.money.max) return { ok: false, msg: `${won(LIMITS.money.max)} 이하로 입력해 주세요` };

  if (q.id === 'amount' && v < q.min * M) return { ok: false, msg: `${won(q.min * M)} 이상 입력해 주세요` };
  if (q.id === 'lump' && a.amount != null) {
    const t = a.goalType === 'house' ? a.amount * (1 - LTV) : a.amount;
    if (v >= t) return { ok: false, msg: `모아둔 돈이 저축 목표(${won(t)})보다 많아요. 이미 달성한 목표예요` };
  }
  if (q.id === 'income') {
    if (v < LIMITS.income.min) return { ok: false, msg: `${won(LIMITS.income.min)} 이상 입력해 주세요` };
    if (v > LIMITS.income.max) return { ok: false, msg: `${won(LIMITS.income.max)} 이하로 입력해 주세요` };
  }
  if (q.id === 'expense') {
    if (S.chat.mode === 'expense') {
      if (v >= a.income) return { ok: false, msg: `지출이 수입(${won(a.income)})보다 크거나 같아요` };
      return { ok: true, msg: `= ${won(v)} · 남는 돈 ${won(a.income - v)}`, warn: REJECT_MSG[rejected] };
    }
    if (v <= 0) return { ok: false, msg: '1만 원 이상 입력해 주세요' };
    if (v > a.income) return { ok: false, msg: `저축액이 수입(${won(a.income)})보다 커요` };
    return { ok: true, msg: `= ${won(v)} · 수입의 ${Math.round(v / a.income * 100)}%`, warn: REJECT_MSG[rejected] };
  }
  if (q.id === 'saving') {
    const max = Math.max(0, a.income - a.expense);
    if (v > max) return { ok: false, msg: `지출을 빼면 ${won(max)}까지 가능해요` };
    if (v <= 0) return { ok: false, msg: '1만 원 이상 입력해 주세요' };
  }
  return { ok: true, msg: `= ${won(v)}`, warn: REJECT_MSG[rejected] };
}

export { keyHint, dataHint, parseNum, validate, REJECT_MSG };
