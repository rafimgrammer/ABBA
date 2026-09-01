// 계산 엔진 — 결정적. 화면의 모든 금액·기간은 여기서만 만든다(AI 없음).
// 배분 규칙: 1년 이내 주식 0%, 3년 이내 주식 최대 35%(초과분은 채권).
import { RATES, TAX, KEYS, BASE, LTV, LOAN_RATE, LOAN_YEARS } from './config.js';

const ENGINE = {
  weights(risk, months) {
    const w = BASE[risk].slice();
    if (months != null && months <= 12) return [60, 35, 5, 0];
    if (months != null && months <= 36 && w[3] > 35) { w[2] += w[3] - 35; w[3] = 35; }
    return w;
  },
  ruleNote(risk, months) {
    if (months != null && months <= 12) return '1년 이내 목표라 주식은 넣지 않고 적금·예금 위주로 갑니다.';
    if (months != null && months <= 36 && BASE[risk][3] > 35) return '3년 이내 목표라 주식은 35%까지만 두고, 초과분은 채권으로 돌립니다.';
    return null;
  },
  project(saving, lump, n, w) {
    saving = Math.max(0, Number(saving) || 0); lump = Math.max(0, Number(lump) || 0); n = Math.max(0, Math.floor(n) || 0); // 음수 방어
    const wf = w.map(x => x / 100);
    const lw = [0, wf[0] + wf[1], wf[2], wf[3]];
    const rows = KEYS.map((key, k) => {
      const d = saving * wf[k], L = lump * lw[k], r = RATES[key];
      let principal, gross;
      if (key === '적금') { principal = d * n + L; gross = d * n + d * (r / 12) * n * (n + 1) / 2 + L; }
      else { const i = r / 12; principal = d * n + L; gross = (d ? d * (Math.pow(1 + i, n) - 1) / i : 0) + L * Math.pow(1 + i, n); }
      const net = principal + (gross - principal) * (1 - TAX);
      return { key, w: w[k], monthly: d, lump: L, principal, gross, net, gain: net - principal };
    });
    const principal = rows.reduce((s, r) => s + r.principal, 0), net = rows.reduce((s, r) => s + r.net, 0);
    return { rows, principal, net, gain: net - principal };
  },
  monthsToGoal(goal, saving, lump, risk) {
    for (let n = 1; n <= 600; n++) if (ENGINE.project(saving, lump, n, ENGINE.weights(risk, n)).net >= goal) return n;
    return null;
  },
  requiredSaving(goal, n, lump, risk) {
    const w = ENGINE.weights(risk, n);
    const lumpNet = ENGINE.project(0, lump, n, w).net, unit = ENGINE.project(1, 0, n, w).net;
    return Math.max(0, (goal - lumpNet) / unit);
  },
  loanPayment(P, rate = LOAN_RATE, years = LOAN_YEARS) { const i = rate / 12, n = years * 12; return P * i / (1 - Math.pow(1 + i, -n)); },
  blend(w) { return w.reduce((s, x, k) => s + x / 100 * RATES[KEYS[k]], 0); },
};

export { ENGINE };
