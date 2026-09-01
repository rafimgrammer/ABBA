// 계획 화면이 쓰는 파생 계산. 화면(Plan.jsx)과 AI 코치(coach.js)가 같은 값을 보게 하려고
// 여기 한 곳에 둔다. React에 기대지 않으므로 Node에서 그대로 돌려 검증할 수 있다.
import { M, LTV } from './config.js';
import { ENGINE } from './engine.js';

/**
 * 답변(a)과 성향(risk)으로 계획 한 벌을 계산한다.
 * 기간을 안 정했으면 도달 개월을 역산하고, 집 목표면 대출까지 붙인다.
 */
function planCalc(a, risk) {
  const house = a.goalType === 'house';
  const target = house ? a.amount * (1 - LTV) : a.amount;   // 자기자본 = 집값 − 대출 상한
  let months = a.months, computed = false, unreachable = false;
  if (months == null) {
    months = ENGINE.monthsToGoal(target, a.saving, a.lump, risk);
    computed = true;
    if (months == null) { unreachable = true; months = 600; }
  }
  const w = ENGINE.weights(risk, months), p = ENGINE.project(a.saving, a.lump, months, w);
  const short = target - p.net;
  const status = unreachable ? 'unreach' : short <= 0 ? 'ok' : short <= target * 0.1 ? 'near' : 'redesign';
  const r = { house, target, months, computed, unreachable, w, p, short, status, risk };
  if (house) {
    const price = a.amount, loan = Math.max(0, price - p.net), cap = price * LTV, over = Math.max(0, loan - cap);
    const pmt = ENGINE.loanPayment(Math.min(loan, cap)), ratio = a.income ? pmt / a.income : 0;
    r.loan = { price, loan, cap, over, pmt, ratio, level: ratio <= 0.3 ? 'ok' : ratio <= 0.4 ? 'warn' : 'bad' };
  }
  return r;
}

/** 목표가 없을 때(그냥 재테크) n개월간 모을 수 있는 금액을 10만 원 단위로 내림한 제안 목표. */
function suggestGoal(a, risk, n) {
  const p = ENGINE.project(a.saving, a.lump, n, ENGINE.weights(risk, n));
  return Math.floor(p.net / (10 * M)) * 10 * M;
}

export { planCalc, suggestGoal };
