// 숫자 입력의 파싱·검증. 음수와 기호는 이 파일에서 전부 막는다.
//
// 3중 방어
//   1) onNumKey        — 숫자가 아닌 글자키를 아예 못 누르게 한다(마이너스 포함)
//   2) parseNum        — 붙여넣기·드롭·IME로 들어온 값에서 숫자만 남기고, 무엇을 걸렀는지 알려준다
//   3) validate        — 0 이하·범위 밖 값을 거부하고 이유를 화면에 띄운다
// 엔진(engine.js)에도 마지막 방어가 있어, 어떤 경로로도 음수가 계산에 들어가지 않는다.
import { M, LIMITS, LTV } from './config.js';
import { fmt, won, ymAdd } from './utils.js';
import { S } from './state.js';
import { live, submitInput } from './screens/chat.js'; // 순환 참조: 호출 시점이 런타임이라 안전

const MINUS = /[-−–—+]/;              // 하이픈·유니코드 마이너스·전각 부호·플러스
const NOT_DIGIT_OR_COMMA = /[^\d,]/;

// 키보드에서 숫자가 아닌 글자키를 차단. 조합키·이동키·삭제키는 통과.
function onNumKey(e) {
  if (e.key === 'Enter') { e.preventDefault(); submitInput(); return; }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key.length !== 1) return;               // Backspace, Arrow, Tab …
  if (/[0-9]/.test(e.key)) return;
  e.preventDefault();
  setHint(MINUS.test(e.key) ? 'negative' : 'char');
  live();
}

// 붙여넣기·드롭은 막지 않고 들여보낸 뒤 parseNum이 정리한다(모바일 IME 호환).
function onNumBeforeInput(e) {
  if (typeof e.data === 'string' && NOT_DIGIT_OR_COMMA.test(e.data)) setHint(MINUS.test(e.data) ? 'negative' : 'char');
}

let hint = null;
function setHint(kind) { hint = kind; }
function takeHint() { const h = hint; hint = null; return h; }

// 입력창의 값에서 숫자만 남기고 콤마를 다시 붙인다. 캐럿 위치는 앞쪽 숫자 개수로 복원.
// 반환: { n, rejected } — rejected는 'negative' | 'char' | null
function parseNum(el) {
  const raw = el.value, pos = el.selectionStart ?? raw.length;
  const digitsBefore = raw.slice(0, pos).replace(/\D/g, '').length;
  const digits = raw.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, LIMITS.digits);
  const out = digits ? fmt(Number(digits)) : '';
  let rejected = takeHint();
  if (!rejected && NOT_DIGIT_OR_COMMA.test(raw)) rejected = MINUS.test(raw) ? 'negative' : 'char';
  if (out !== raw) {
    el.value = out;
    let c = 0, i = 0;
    while (i < out.length && c < digitsBefore) { if (/\d/.test(out[i])) c++; i++; }
    try { el.setSelectionRange(i, i); } catch (e) { }
  }
  return { n: digits ? Number(digits) : null, rejected };
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

export { onNumKey, onNumBeforeInput, parseNum, validate, REJECT_MSG };
