// 추천 계획 — 배분·예상 수익·부족분·조정안·대출 카드.
import { M, LTV, RATES } from '../config.js';
import { fmt, won, ymAdd } from '../utils.js';
import { ico } from '../icons.js';
import { ENGINE } from '../engine.js';
import { S, GOAL_LABEL } from '../state.js';
import { topBar, tabbar, toast } from '../ui.js';
import { go, render } from '../router.js';

function planCalc(risk) {
  const a = S.a;
  const house = a.goalType === 'house';
  const target = house ? a.amount * 0.3 : a.amount;
  let months = a.months, computed = false, unreachable = false;
  if (months == null) { months = ENGINE.monthsToGoal(target, a.saving, a.lump, risk); computed = true; if (months == null) { unreachable = true; months = 600; } }
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

function suggestGoal(n) { const p = ENGINE.project(S.a.saving, S.a.lump, n, ENGINE.weights(S.planRisk || S.a.risk, n)); return Math.floor(p.net / (10 * M)) * 10 * M; }

function pickSuggest(n) { S.a.months = n; S.a.amount = suggestGoal(n); S.a.suggested = true; render(); }

function setRisk(r) { S.planRisk = r; if (S.a.goalType === 'none' && S.a.suggested) S.a.amount = suggestGoal(S.a.months); render(); }

function applyMonths(n) { S.a.months = n; S.a.monthsKnown = true; toast(`기간을 ${n}개월로 바꿨어요`); render(); }

function applySaving(v) { S.a.saving = v; toast(`월 저축액을 ${won(v)}으로 바꿨어요`); render(); }

function applyRisk(r) { S.planRisk = r; toast(`${r}으로 바꿨어요`); render(); }

const STATUS = { ok: ['ok', '계획대로 가능'], near: ['warn', '조금 부족'], redesign: ['bad', '재설계 필요'], unreach: ['bad', '도달 어려움'] };

function vPlan() {
  const a = S.a; const risk = S.planRisk || a.risk;
  let suggestCard = '';
  if (a.goalType === 'none') {
    if (a.amount == null) { if (a.months == null) a.months = 24; a.amount = suggestGoal(a.months); a.suggested = true; }
    const opts = a.monthsKnown ? [a.months] : [12, 24, 36];
    suggestCard = `<div class="card"><h3>${ico('target', 18)}제안한 목표</h3>
      <div class="sub">매달 ${won(a.saving)} 저축${a.lump ? ` + 모아둔 ${won(a.lump)}` : ''} 기준으로 ${risk} 배분을 하면 이만큼 모여요. 이 금액을 목표로 잡아 계획을 세웠어요.</div>
      <div class="opts">${opts.map(n => `<button class="opt ${a.months === n ? 'sel' : ''}" onclick="pickSuggest(${n})"><b>${won(suggestGoal(n))}</b><span>${n % 12 === 0 ? `${n / 12}년` : `${n}개월`} 뒤</span></button>`).join('')}</div>
      ${a.monthsKnown ? '' : '<div class="muted" style="margin-top:8px">기간을 정하지 않으셔서 1·2·3년 세 가지로 제안했어요.</div>'}</div>`;
  }
  const c = planCalc(risk);
  const [pc, pl] = STATUS[c.status];
  const goalName = a.goalType === 'house' ? `집 사기 · 집값 ${won(a.amount)}` : a.goalType === 'none' ? `제안 목표 ${won(a.amount)}` : `${GOAL_LABEL[a.goalType]} ${won(a.amount)}`;
  const monthsLabel = c.unreachable ? '50년 내 도달 어려움' : c.computed ? `${c.months}개월 (계산)` : `${c.months}개월`;
  const reach = c.unreachable ? '' : `${ymAdd(c.months - 1)} 도달`;
  const ratio = Math.min(1, c.p.net / c.target);

  // 요약 카드
  const summary = `<div class="card">
    <div class="hr"><div class="sub" style="font-weight:600;color:var(--t1)">${goalName}</div><span class="pill ${pc}">${pl}</span></div>
    <div class="muted">${a.goalType === 'house' ? `저축 목표(자기자본 30%) ${won(c.target)} · ` : ''}${monthsLabel} · 월 ${won(a.saving)}${a.lump ? ` · 모아둔 ${won(a.lump)}` : ''}</div>
    <div class="big" style="margin-top:14px">${won(c.p.net)}</div>
    <div class="sub">${c.unreachable ? '50년 기준 예상 총액' : `${c.months}개월 뒤 예상 총액`} · 원금 ${won(c.p.principal)} + 수익 ${won(c.p.gain)}<span class="muted">(세후)</span></div>
    <div class="progbar"><i style="width:${Math.round(ratio * 100)}%"></i></div>
    <div class="help" style="margin-top:0"><span>목표 ${won(c.target)}${c.short > 0 ? ` · ${won(c.short)} 부족` : ` · ${won(-c.short)} 여유`}</span><span>${reach}</span></div>
  </div>`;

  // 성향 선택
  const seg = `<div class="segp">${['안정형', '중립형', '공격형'].map(r => `<button class="${risk === r ? 'on' : ''}" onclick="setRisk('${r}')">${r}</button>`).join('')}</div>`;

  // 배분 카드
  const cls = ['c1', 'c2', 'c3', 'c4'];
  const rule = ENGINE.ruleNote(risk, c.unreachable ? null : c.months);
  const alloc = `<div class="card"><h3>${ico('pie', 18)}추천 배분 <span class="muted" style="font-weight:500">${risk} · 가정 수익률 연 ${(ENGINE.blend(c.w) * 100).toFixed(1)}%</span></h3>
    <div class="stack">${c.w.map((x, k) => x ? `<i class="${cls[k]}" style="width:${x}%"></i>` : '').join('')}</div>
    ${c.p.rows.map((r, k) => `<div class="arow"><span class="dot ${cls[k]}"></span><div class="r1">${r.key} <span class="muted">${r.w}%</span></div><div class="amt">${r.w ? `월 ${won(r.monthly, true)}` : '-'}</div>
      <div class="r2"><span>${r.key === '적금' ? '단리' : '월복리'} 연 ${(RATES[r.key] * 100).toFixed(1)}%${r.lump ? ` · 모아둔 돈 ${won(r.lump, true)}` : ''}</span><span>예상 수익 ${r.w || r.lump ? won(r.gain, true) : '-'}</span></div></div>`).join('')}
    ${rule ? `<div class="note">${ico('info', 16)}<div>${rule}</div></div>` : ''}
    <details><summary>${ico('down', 14)} 왜 이 비율인가요?</summary><div class="body">
      성향별 기본 비율(적금·예금·채권·주식)은 안정형 50·30·15·5, 중립형 35·15·20·30, 공격형 20·10·15·55입니다. 기간이 1년 이내면 60·35·5·0으로 바꾸고, 3년 이내면 주식을 35%까지만 둡니다. 모아둔 돈은 적금 대신 예금·채권·주식에 같은 비율로 나눕니다. 수익은 이자·수익에 15.4% 세금을 뺀 값이고, 실제 상품 수익률은 다를 수 있어요.<br><br>
      상품 유형 예시: 적금은 은행 정기적금 12개월 자동이체, 예금은 파킹통장·정기예금(비상금 겸용), 채권은 국내 채권 ETF 적립 매수, 주식은 국내 지수 ETF 적립 매수.
      ${c.w[3] > 0 && c.months < 36 ? '<br><br>주식 비중이 있고 기간이 3년 미만이면 목표일에 손실 상태일 수 있어요. 목표일 6개월 전부터는 주식 비중을 줄이는 걸 권해요.' : ''}
    </div></details>
  </div>`;

  // 부족 시 조정안 / 여유 시 안내
  let adjust = '';
  if (c.status !== 'ok' && !c.computed) {
    const n2 = ENGINE.monthsToGoal(c.target, a.saving, a.lump, risk);
    const req = ENGINE.requiredSaving(c.target, c.months, a.lump, risk); const reqR = Math.ceil(req / M) * M;
    const maxSave = a.expense != null ? a.income - a.expense : a.income;
    const next = risk === '안정형' ? '중립형' : risk === '중립형' ? '공격형' : null;
    let riskAlt = '';
    if (next && c.months > 12) {
      const pn = ENGINE.project(a.saving, a.lump, c.months, ENGINE.weights(next, c.months));
      const covers = pn.net >= c.target;
      riskAlt = `<div class="alt ${covers ? '' : 'off'}"><div><b>${next}으로 바꾸기</b><span>예상 총액 ${won(pn.net)} (+${won(pn.net - c.p.net)})${covers ? '' : ' · 성향만 바꿔서는 부족분을 못 메워요'}</span></div>${covers ? `<button class="btn sm ghost" onclick="applyRisk('${next}')">적용</button>` : ''}</div>`;
    }
    adjust = `<div class="card"><h3>${ico('sliders', 18)}부족분 ${won(c.short)}을 메우려면</h3>
      ${n2 ? `<div class="alt rec"><div><b><span class="rectag">추천</span>기간을 ${n2}개월로 늘리기</b><span>${ymAdd(n2 - 1)} 도달 · 월 저축액 그대로</span></div><button class="btn sm" onclick="applyMonths(${n2})">적용</button></div>` : `<div class="alt off"><div><b>기간 늘리기</b><span>월 저축액으로는 50년 안에 도달하기 어려워요</span></div></div>`}
      <div class="alt ${reqR > maxSave ? 'off' : ''}"><div><b>월 저축을 ${won(reqR)}으로 올리기</b><span>지금보다 +${won(reqR - a.saving)}${reqR > maxSave ? ` · 지출을 빼면 ${won(maxSave)}까지만 가능해요` : ''}</span></div>${reqR > maxSave ? '' : `<button class="btn sm ghost" onclick="applySaving(${reqR})">적용</button>`}</div>
      ${riskAlt}
    </div>`;
  } else if (c.status === 'ok' && !c.computed) {
    const n3 = ENGINE.monthsToGoal(c.target, a.saving, a.lump, risk);
    adjust = `<div class="card"><h3>${ico('check', 18)}계획대로 가면 목표를 넘겨요</h3><div class="sub">${won(-c.short)} 여유가 있어요.${n3 && n3 < c.months ? ` 기간을 ${n3}개월(${ymAdd(n3 - 1)})로 줄여도 도달할 수 있어요.` : ''}</div>${n3 && n3 < c.months ? `<div class="alt"><div><b>기간을 ${n3}개월로 줄이기</b><span>월 저축액 그대로</span></div><button class="btn sm ghost" onclick="applyMonths(${n3})">적용</button></div>` : ''}</div>`;
  } else if (c.computed && !c.unreachable) {
    adjust = `<div class="card"><h3>${ico('cal', 18)}기간을 계산했어요</h3><div class="sub">매달 ${won(a.saving)}씩 ${risk} 배분으로 모으면 ${c.months}개월 뒤인 ${ymAdd(c.months - 1)}에 ${won(c.target)}에 도달해요.</div></div>`;
  } else if (c.unreachable) {
    const req5 = Math.ceil(ENGINE.requiredSaving(c.target, 60, a.lump, risk) / M) * M;
    adjust = `<div class="card"><h3>${ico('warn', 18)}지금 저축액으로는 어려워요</h3><div class="sub">매달 ${won(a.saving)}으로는 50년 안에 ${won(c.target)}에 도달하기 어려워요. 5년 안에 도달하려면 월 ${won(req5)}이 필요해요.</div></div>`;
  }

  // 대출 카드 (집 사기)
  let loan = '';
  if (c.house) {
    const L = c.loan; const lv = { ok: '여유', warn: '주의', bad: '기준 초과' }[L.level];
    loan = `<div class="card"><h3>${ico('house', 18)}대출까지 같이 보면</h3>
      <div class="row first"><span class="k">목표 집값</span><span class="v">${won(L.price)}</span></div>
      <div class="row"><span class="k">${c.unreachable ? '50년 뒤' : `${c.months}개월 뒤`} 예상 자기자본</span><span class="v">${won(c.p.net)}</span></div>
      <div class="row"><span class="k">필요 대출액</span><span class="v">${won(L.loan)}</span></div>
      <div class="row"><span class="k">LTV 70% 상한 <span class="tagx need">가정</span></span><span class="v">${won(L.cap)}${L.over ? `<div class="muted" style="color:var(--bad)">상한 초과 ${won(L.over)}</div>` : ''}</span></div>
      <div class="row"><span class="k">월 상환액 <span class="muted">연 4.0% · 30년 · 원리금균등</span></span><span class="v">${won(L.pmt, true)}</span></div>
      <div class="row"><span class="k">수입 대비 상환 비율</span><span class="v">${Math.round(L.ratio * 100)}% <span class="pill ${L.level}">${lv}</span></span></div>
      <div class="note">${ico('info', 16)}<div>LTV·DSR(40% 기준)·금리는 지역과 규제, 소득에 따라 달라요. 실제 한도는 은행 상담으로 확인해야 해요. ${L.over ? `상한을 넘는 ${won(L.over)}은 자기자본을 더 모아야 해요.` : '수입 대비 30% 이하면 여유, 40%를 넘으면 대출이 어려울 수 있어요.'}</div></div>
    </div>`;
  }

  const assume = `<div class="card"><details open><summary>${ico('down', 14)} 계산 가정 보기</summary><div class="body">
    <table><tr><th>자산</th><th>연 수익률(세전)</th><th>방식</th></tr>
    <tr><td>적금</td><td>3.5%</td><td>단리</td></tr><tr><td>예금</td><td>3.2%</td><td>월복리</td></tr><tr><td>채권</td><td>4.0%</td><td>월복리</td></tr><tr><td>주식</td><td>7.5%</td><td>월복리</td></tr></table>
    <div style="margin-top:8px">2026년 8월 기준 가정입니다. 한국은행 기준금리 연 3.00%(2026-08-27), 은행권 12개월 정기예금 약 4% 수준을 참고해 적금 3.5%·예금 3.2%로 보수적으로 잡았고, 주식 7.5%는 코스피 배당 포함 장기 연평균(2005~2024, 약 7.5%)입니다. 채권 4.0%는 국내 채권 ETF 기대치 <span class="tagx need">확인 필요</span>. 세금은 15.4%를 일괄 적용했고(국내 주식형 ETF 비과세 등 미반영), 본 구현에서는 금감원 금융상품 공시 API 값으로 대체합니다.</div>
  </div></details></div>`;

  return `${topBar('추천 계획', { backTo: 'chat', right: `<button class="ib" aria-label="답변 수정" onclick="go('chat')">${ico('pencil', 20)}</button>` })}
  <div class="main fade" style="padding-bottom:150px">${suggestCard}${summary}${seg}${alloc}${adjust}${loan}${assume}</div>
  <div class="cta tabbed"><button class="btn" onclick="go('brief')">${ico('bell', 18)} 매일 브리핑 받기</button></div>${tabbar('plan')}`;
}

export { planCalc, suggestGoal, pickSuggest, setRisk, applyMonths, applySaving, applyRisk, vPlan };
