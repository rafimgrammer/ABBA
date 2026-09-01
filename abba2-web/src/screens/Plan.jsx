// 추천 계획 — 배분·예상 수익·부족분·조정안·대출 카드.
import { M, LTV, RATES } from '../lib/config.js';
import { won, ymAdd } from '../lib/utils.js';
import { Icon } from '../components/Icon.jsx';
import { TopBar, TabBar } from '../components/Chrome.jsx';
import { ENGINE } from '../lib/engine.js';
import { S, GOAL_LABEL, update, useStore, toast } from '../store.js';
import { go } from '../routing.js';

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

function pickSuggest(n) { S.a.months = n; S.a.amount = suggestGoal(n); S.a.suggested = true; update(); }

function setRisk(r) { S.planRisk = r; if (S.a.goalType === 'none' && S.a.suggested) S.a.amount = suggestGoal(S.a.months); update(); }

function applyMonths(n) { S.a.months = n; S.a.monthsKnown = true; update(); toast(`기간을 ${n}개월로 바꿨어요`); }

function applySaving(v) { S.a.saving = v; update(); toast(`월 저축액을 ${won(v)}으로 바꿨어요`); }

function applyRisk(r) { S.planRisk = r; update(); toast(`${r}으로 바꿨어요`); }

const STATUS = { ok: ['ok', '계획대로 가능'], near: ['warn', '조금 부족'], redesign: ['bad', '재설계 필요'], unreach: ['bad', '도달 어려움'] };
const CLS = ['c1', 'c2', 'c3', 'c4'];

/** 조정안 한 줄. rec=추천 강조, off=적용 불가(버튼 없음). */
function Alt({ rec, off, title, desc, onApply, applyLabel = '적용', ghost = true }) {
  return (
    <div className={`alt${rec ? ' rec' : ''}${off ? ' off' : ''}`}>
      <div><b>{rec && <span className="rectag">추천</span>}{title}</b><span>{desc}</span></div>
      {onApply && <button className={`btn sm${ghost ? ' ghost' : ''}`} onClick={onApply}>{applyLabel}</button>}
    </div>
  );
}

function SuggestCard({ a, risk }) {
  const opts = a.monthsKnown ? [a.months] : [12, 24, 36];
  return (
    <div className="card">
      <h3><Icon name="target" size={18} />제안한 목표</h3>
      <div className="sub">매달 {won(a.saving)} 저축{a.lump ? ` + 모아둔 ${won(a.lump)}` : ''} 기준으로 {risk} 배분을 하면 이만큼 모여요. 이 금액을 목표로 잡아 계획을 세웠어요.</div>
      <div className="opts">
        {opts.map(n => (
          <button key={n} className={`opt ${a.months === n ? 'sel' : ''}`} onClick={() => pickSuggest(n)}>
            <b>{won(suggestGoal(n))}</b><span>{n % 12 === 0 ? `${n / 12}년` : `${n}개월`} 뒤</span>
          </button>
        ))}
      </div>
      {!a.monthsKnown && <div className="muted" style={{ marginTop: 8 }}>기간을 정하지 않으셔서 1·2·3년 세 가지로 제안했어요.</div>}
    </div>
  );
}

function AllocCard({ c, risk }) {
  const rule = ENGINE.ruleNote(risk, c.unreachable ? null : c.months);
  return (
    <div className="card">
      <h3><Icon name="pie" size={18} />추천 배분 <span className="muted" style={{ fontWeight: 500 }}>{risk} · 가정 수익률 연 {(ENGINE.blend(c.w) * 100).toFixed(1)}%</span></h3>
      <div className="stack">{c.w.map((x, k) => x ? <i key={k} className={CLS[k]} style={{ width: `${x}%` }} /> : null)}</div>
      {c.p.rows.map((r, k) => (
        <div className="arow" key={r.key}>
          <span className={`dot ${CLS[k]}`} />
          <div className="r1">{r.key} <span className="muted">{r.w}%</span></div>
          <div className="amt">{r.w ? `월 ${won(r.monthly, true)}` : '-'}</div>
          <div className="r2">
            <span>{r.key === '적금' ? '단리' : '월복리'} 연 {(RATES[r.key] * 100).toFixed(1)}%{r.lump ? ` · 모아둔 돈 ${won(r.lump, true)}` : ''}</span>
            <span>예상 수익 {r.w || r.lump ? won(r.gain, true) : '-'}</span>
          </div>
        </div>
      ))}
      {rule && <div className="note"><Icon name="info" size={16} /><div>{rule}</div></div>}
      <details>
        <summary><Icon name="down" size={14} /> 왜 이 비율인가요?</summary>
        <div className="body">
          성향별 기본 비율(적금·예금·채권·주식)은 안정형 50·30·15·5, 중립형 35·15·20·30, 공격형 20·10·15·55입니다. 기간이 1년 이내면 60·35·5·0으로 바꾸고, 3년 이내면 주식을 35%까지만 둡니다. 모아둔 돈은 적금 대신 예금·채권·주식에 같은 비율로 나눕니다. 수익은 이자·수익에 15.4% 세금을 뺀 값이고, 실제 상품 수익률은 다를 수 있어요.<br /><br />
          상품 유형 예시: 적금은 은행 정기적금 12개월 자동이체, 예금은 파킹통장·정기예금(비상금 겸용), 채권은 국내 채권 ETF 적립 매수, 주식은 국내 지수 ETF 적립 매수.
          {c.w[3] > 0 && c.months < 36 && <><br /><br />주식 비중이 있고 기간이 3년 미만이면 목표일에 손실 상태일 수 있어요. 목표일 6개월 전부터는 주식 비중을 줄이는 걸 권해요.</>}
        </div>
      </details>
    </div>
  );
}

function AdjustCard({ c, a, risk }) {
  // 1) 기간을 정했는데 부족한 경우 — 기간·저축액·성향 세 갈래를 제안한다
  if (c.status !== 'ok' && !c.computed) {
    const n2 = ENGINE.monthsToGoal(c.target, a.saving, a.lump, risk);
    const reqR = Math.ceil(ENGINE.requiredSaving(c.target, c.months, a.lump, risk) / M) * M;
    const maxSave = a.expense != null ? a.income - a.expense : a.income;
    const next = risk === '안정형' ? '중립형' : risk === '중립형' ? '공격형' : null;
    let riskAlt = null;
    if (next && c.months > 12) {
      const pn = ENGINE.project(a.saving, a.lump, c.months, ENGINE.weights(next, c.months));
      const covers = pn.net >= c.target;
      riskAlt = <Alt off={!covers} title={`${next}으로 바꾸기`}
        desc={`예상 총액 ${won(pn.net)} (+${won(pn.net - c.p.net)})${covers ? '' : ' · 성향만 바꿔서는 부족분을 못 메워요'}`}
        onApply={covers ? () => applyRisk(next) : null} />;
    }
    return (
      <div className="card">
        <h3><Icon name="sliders" size={18} />부족분 {won(c.short)}을 메우려면</h3>
        {n2
          ? <Alt rec title={`기간을 ${n2}개월로 늘리기`} desc={`${ymAdd(n2 - 1)} 도달 · 월 저축액 그대로`} onApply={() => applyMonths(n2)} ghost={false} />
          : <Alt off title="기간 늘리기" desc="월 저축액으로는 50년 안에 도달하기 어려워요" />}
        <Alt off={reqR > maxSave} title={`월 저축을 ${won(reqR)}으로 올리기`}
          desc={`지금보다 +${won(reqR - a.saving)}${reqR > maxSave ? ` · 지출을 빼면 ${won(maxSave)}까지만 가능해요` : ''}`}
          onApply={reqR > maxSave ? null : () => applySaving(reqR)} />
        {riskAlt}
      </div>
    );
  }
  // 2) 여유가 있는 경우 — 기간 단축을 제안한다
  if (c.status === 'ok' && !c.computed) {
    const n3 = ENGINE.monthsToGoal(c.target, a.saving, a.lump, risk);
    const shorter = n3 && n3 < c.months;
    return (
      <div className="card">
        <h3><Icon name="check" size={18} />계획대로 가면 목표를 넘겨요</h3>
        <div className="sub">{won(-c.short)} 여유가 있어요.{shorter ? ` 기간을 ${n3}개월(${ymAdd(n3 - 1)})로 줄여도 도달할 수 있어요.` : ''}</div>
        {shorter && <Alt title={`기간을 ${n3}개월로 줄이기`} desc="월 저축액 그대로" onApply={() => applyMonths(n3)} />}
      </div>
    );
  }
  // 3) 기간을 비워둬 계산한 경우
  if (c.computed && !c.unreachable) {
    return (
      <div className="card">
        <h3><Icon name="cal" size={18} />기간을 계산했어요</h3>
        <div className="sub">매달 {won(a.saving)}씩 {risk} 배분으로 모으면 {c.months}개월 뒤인 {ymAdd(c.months - 1)}에 {won(c.target)}에 도달해요.</div>
      </div>
    );
  }
  // 4) 50년 안에 도달 불가
  const req5 = Math.ceil(ENGINE.requiredSaving(c.target, 60, a.lump, risk) / M) * M;
  return (
    <div className="card">
      <h3><Icon name="warn" size={18} />지금 저축액으로는 어려워요</h3>
      <div className="sub">매달 {won(a.saving)}으로는 50년 안에 {won(c.target)}에 도달하기 어려워요. 5년 안에 도달하려면 월 {won(req5)}이 필요해요.</div>
    </div>
  );
}

function LoanCard({ c }) {
  const L = c.loan;
  const lv = { ok: '여유', warn: '주의', bad: '기준 초과' }[L.level];
  return (
    <div className="card">
      <h3><Icon name="house" size={18} />대출까지 같이 보면</h3>
      <div className="row first"><span className="k">목표 집값</span><span className="v">{won(L.price)}</span></div>
      <div className="row"><span className="k">{c.unreachable ? '50년 뒤' : `${c.months}개월 뒤`} 예상 자기자본</span><span className="v">{won(c.p.net)}</span></div>
      <div className="row"><span className="k">필요 대출액</span><span className="v">{won(L.loan)}</span></div>
      <div className="row"><span className="k">LTV 70% 상한 <span className="tagx need">가정</span></span>
        <span className="v">{won(L.cap)}{L.over ? <div className="muted" style={{ color: 'var(--bad)' }}>상한 초과 {won(L.over)}</div> : null}</span></div>
      <div className="row"><span className="k">월 상환액 <span className="muted">연 4.0% · 30년 · 원리금균등</span></span><span className="v">{won(L.pmt, true)}</span></div>
      <div className="row"><span className="k">수입 대비 상환 비율</span><span className="v">{Math.round(L.ratio * 100)}% <span className={`pill ${L.level}`}>{lv}</span></span></div>
      <div className="note"><Icon name="info" size={16} /><div>LTV·DSR(40% 기준)·금리는 지역과 규제, 소득에 따라 달라요. 실제 한도는 은행 상담으로 확인해야 해요. {L.over ? `상한을 넘는 ${won(L.over)}은 자기자본을 더 모아야 해요.` : '수입 대비 30% 이하면 여유, 40%를 넘으면 대출이 어려울 수 있어요.'}</div></div>
    </div>
  );
}

function AssumeCard() {
  return (
    <div className="card">
      <details open>
        <summary><Icon name="down" size={14} /> 계산 가정 보기</summary>
        <div className="body">
          <table><tbody>
            <tr><th>자산</th><th>연 수익률(세전)</th><th>방식</th></tr>
            <tr><td>적금</td><td>3.5%</td><td>단리</td></tr>
            <tr><td>예금</td><td>3.2%</td><td>월복리</td></tr>
            <tr><td>채권</td><td>4.0%</td><td>월복리</td></tr>
            <tr><td>주식</td><td>7.5%</td><td>월복리</td></tr>
          </tbody></table>
          <div style={{ marginTop: 8 }}>2026년 8월 기준 가정입니다. 한국은행 기준금리 연 3.00%(2026-08-27), 은행권 12개월 정기예금 약 4% 수준을 참고해 적금 3.5%·예금 3.2%로 보수적으로 잡았고, 주식 7.5%는 코스피 배당 포함 장기 연평균(2005~2024, 약 7.5%)입니다. 채권 4.0%는 국내 채권 ETF 기대치 <span className="tagx need">확인 필요</span>. 세금은 15.4%를 일괄 적용했고(국내 주식형 ETF 비과세 등 미반영), 본 구현에서는 금감원 금융상품 공시 API 값으로 대체합니다.</div>
        </div>
      </details>
    </div>
  );
}

export function Plan() {
  useStore();
  const a = S.a;
  const risk = S.planRisk || a.risk;

  // 목표가 없으면(그냥 재테크) 저축 가능액으로 목표를 먼저 제안한다.
  if (a.goalType === 'none' && a.amount == null) {
    if (a.months == null) a.months = 24;
    a.amount = suggestGoal(a.months); a.suggested = true;
  }

  const c = planCalc(risk);
  const [pc, pl] = STATUS[c.status];
  const goalName = a.goalType === 'house' ? `집 사기 · 집값 ${won(a.amount)}` : a.goalType === 'none' ? `제안 목표 ${won(a.amount)}` : `${GOAL_LABEL[a.goalType]} ${won(a.amount)}`;
  const monthsLabel = c.unreachable ? '50년 내 도달 어려움' : c.computed ? `${c.months}개월 (계산)` : `${c.months}개월`;
  const reach = c.unreachable ? '' : `${ymAdd(c.months - 1)} 도달`;
  const ratio = Math.min(1, c.p.net / c.target);

  return (
    <>
      <TopBar title="추천 계획" backTo="chat"
        right={<button className="ib" aria-label="답변 수정" onClick={() => go('chat')}><Icon name="pencil" size={20} /></button>} />
      <div className="main fade" style={{ paddingBottom: 150 }}>
        {a.goalType === 'none' && <SuggestCard a={a} risk={risk} />}

        <div className="card">
          <div className="hr"><div className="sub" style={{ fontWeight: 600, color: 'var(--t1)' }}>{goalName}</div><span className={`pill ${pc}`}>{pl}</span></div>
          <div className="muted">{a.goalType === 'house' ? `저축 목표(자기자본 30%) ${won(c.target)} · ` : ''}{monthsLabel} · 월 {won(a.saving)}{a.lump ? ` · 모아둔 ${won(a.lump)}` : ''}</div>
          <div className="big" style={{ marginTop: 14 }}>{won(c.p.net)}</div>
          <div className="sub">{c.unreachable ? '50년 기준 예상 총액' : `${c.months}개월 뒤 예상 총액`} · 원금 {won(c.p.principal)} + 수익 {won(c.p.gain)}<span className="muted">(세후)</span></div>
          <div className="progbar"><i style={{ width: `${Math.round(ratio * 100)}%` }} /></div>
          <div className="help" style={{ marginTop: 0 }}>
            <span>목표 {won(c.target)}{c.short > 0 ? ` · ${won(c.short)} 부족` : ` · ${won(-c.short)} 여유`}</span>
            <span>{reach}</span>
          </div>
        </div>

        <div className="segp">
          {['안정형', '중립형', '공격형'].map(r => (
            <button key={r} className={risk === r ? 'on' : ''} onClick={() => setRisk(r)}>{r}</button>
          ))}
        </div>

        <AllocCard c={c} risk={risk} />
        <AdjustCard c={c} a={a} risk={risk} />
        {c.house && <LoanCard c={c} />}
        <AssumeCard />
      </div>
      <div className="cta tabbed"><button className="btn" onClick={() => go('brief')}><Icon name="bell" size={18} /> 매일 브리핑 받기</button></div>
      <TabBar cur="plan" />
    </>
  );
}

export { planCalc, suggestGoal };
