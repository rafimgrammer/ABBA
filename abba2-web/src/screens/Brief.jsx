// 오늘의 브리핑 — 계획 점검·등락·금리 상품·뉴스·지표·할 일.
// 시세·뉴스·상품은 예시 데이터다. 실데이터는 본 구현의 배치가 채운다.
import { M } from '../lib/config.js';
import { won, todayLabel, today } from '../lib/utils.js';
import { Icon } from '../components/Icon.jsx';
import { TopBar, TabBar } from '../components/Chrome.jsx';
import { ENGINE } from '../lib/engine.js';
import { S, blank, useStore, planReady } from '../store.js';
import { planCalc } from '../lib/plan.js';

function briefPlan() {
  if (!planReady()) {
    const a = Object.assign(blank(), { goalType: 'lump', amount: 3000 * M, months: 24, monthsKnown: true, lump: 0, income: 250 * M, expense: 160 * M, saving: 90 * M, risk: '중립형' });
    const w = ENGINE.weights('중립형', 24);
    return { a, w, p: ENGINE.project(a.saving, a.lump, 24, w), months: 24, sample: true, target: a.amount };
  }
  const c = planCalc(S.a, S.planRisk || S.a.risk);
  return { a: S.a, w: c.w, p: c.p, months: c.months, sample: false, target: c.target };
}

const SERIES = (() => {
  const up = [], dn = [];
  for (let i = 0; i < 45; i++) {
    const wob = 0.9 * Math.sin(i * 0.8) + 0.5 * Math.sin(i * 2.3);
    up.push(i < 38 ? 104 - i * 0.2 + wob : 96.4 + (i - 38) * 1.8 + wob);   // 완만한 하락 뒤 최근 7일 반등 → 골든크로스 4일째
    dn.push(i < 38 ? 100 + i * 0.2 + wob : 107.6 - (i - 38) * 1.8 + wob);  // 완만한 상승 뒤 최근 7일 하락 → 데드크로스 4일째
  }
  return { up, dn };
})();

function ma(arr, n) { return arr.map((_, i) => i < n - 1 ? null : arr.slice(i - n + 1, i + 1).reduce((s, x) => s + x, 0) / n); }

function maState(arr) {
  const m5 = ma(arr, 5), m20 = ma(arr, 20); const l = arr.length - 1; const above = m5[l] > m20[l];
  let days = 0; for (let i = l; i >= 19; i--) { if ((m5[i] > m20[i]) === above) days++; else break; }
  return { above, days };
}

/** 종가·5일선·20일선 스파크라인. 값은 SERIES(정적 예시)에서만 온다. */
function Spark({ arr }) {
  const m5 = ma(arr, 5), m20 = ma(arr, 20), from = 20;
  const xs = arr.slice(from), a5 = m5.slice(from), a20 = m20.slice(from);
  const all = xs.concat(a5, a20).filter(x => x != null);
  const lo = Math.min(...all) - 0.5, hi = Math.max(...all) + 0.5;
  const W = 360, H = 100;
  const X = i => (i / (xs.length - 1)) * (W - 4) + 2;
  const Y = v => H - 4 - (v - lo) / (hi - lo) * (H - 8);
  const pts = d => d.map((v, i) => v == null ? '' : `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).filter(Boolean).join(' ');
  return (
    <>
      <svg className="spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-label="최근 25일 가격과 이동평균선">
        <polyline fill="none" points={pts(xs)} stroke="#17202A" strokeWidth="1.6" />
        <polyline fill="none" points={pts(a5)} stroke="#0F766E" strokeWidth="2" />
        <polyline fill="none" points={pts(a20)} stroke="#F0A63A" strokeWidth="2" strokeDasharray="5 3" />
      </svg>
      <div className="lgd">
        <span><i style={{ borderColor: '#17202A' }} />종가</span>
        <span><i style={{ borderColor: '#0F766E' }} />5일선</span>
        <span><i style={{ borderColor: '#F0A63A', borderTopStyle: 'dashed' }} />20일선</span>
      </div>
    </>
  );
}

const OFF_TITLE = { price: '보유 종목 등락', rate: '더 높은 금리 상품', news: '종목 뉴스 분석', ma: '지표 전망' };

function OffCard({ which }) {
  return (
    <div className="card" style={{ opacity: 0.6 }}>
      <div className="hr"><h3 style={{ margin: 0 }}>{OFF_TITLE[which]}</h3><span className="pill">알림 꺼짐</span></div>
      <div className="muted">설정에서 다시 켤 수 있어요.</div>
    </div>
  );
}

function AiSay({ children }) {
  return <div className="aisay"><div className="av">AI</div><div>{children}</div></div>;
}

const HOLDS = [
  { name: 'KODEX 200', kind: '주식 ETF · 계획 자산', chg: 1.8 },
  { name: 'KODEX 국고채10년', kind: '채권 ETF · 계획 자산', chg: -0.2 },
  { name: '삼성전자', kind: '개별 주식 · 별도 보유', chg: -3.2 },
];

const NEWS = [
  ['메모리 가격 하락 전망을 다룬 보도', 'badn', '악재'],
  ['신규 파운드리 수주 발표', 'good', '호재'],
  ['외국인 3거래일 연속 순매도', 'badn', '악재'],
  ['하반기 신제품 출시 일정 보도', 'neu', '중립'],
];

export function Brief() {
  useStore();
  const B = briefPlan(), st = S.brief, al = st.alerts;
  const chg = v => (
    <div className={`chg ${v > 0 ? 'up' : v < 0 ? 'down' : 'flat'}`}>
      {v > 0 ? '+' : ''}{v.toFixed(1)}%{Math.abs(v) >= st.th && <small>알림 기준 ±{st.th}% 초과</small>}
    </div>
  );
  const [dJ, dY, dC, dJu] = B.p.rows.map(r => r.monthly);
  const n = Math.min(B.months, 600);
  const extra = dJ * (0.008 / 12) * n * (n + 1) / 2;
  const first = B.a.saving + B.a.lump, pr = Math.min(1, first / B.target);
  const upS = maState(SERIES.up), dnS = maState(SERIES.dn);
  const mm = today().getMonth() + 1;

  return (
    <>
      <TopBar title="오늘의 브리핑" back={false}
        right={<><span className="badge">예시 데이터</span><span style={{ width: 8 }} /></>} />
      <div className="main fade" style={{ paddingBottom: 110 }}>
        <div className="sub" style={{ margin: '2px 0 12px' }}>
          {todayLabel()} {st.time} · AI가 계좌·시장·뉴스를 한 번에 정리했어요
          {B.sample && <> · <b>예시 계획(월 90만·중립형) 기준</b></>}
        </div>

        <div className="card">
          <h3><Icon name="target" size={18} />내 계획 점검</h3>
          <div className="row first"><span className="k">이번 달 저축 {won(B.a.saving)}</span><span className="pill ok">진행 중</span></div>
          <div className="todo first" style={{ marginTop: 6 }}>
            <span className="chk on"><Icon name="check" size={14} /></span>
            <div>적금 {won(dJ, true)} · 예금 {won(dY, true)} 자동이체 완료<span>{mm}월 25일</span></div>
          </div>
          <div className="todo">
            <span className="chk" />
            <div>채권 ETF {won(dC, true)} · 주식 ETF {won(dJu, true)} 정기 매수 예정<span>{mm}월 30일 · 계획 비율 채권 {B.w[2]}% · 주식 {B.w[3]}%</span></div>
          </div>
          <div className="progbar"><i style={{ width: `${Math.max(2, Math.round(pr * 100))}%` }} /></div>
          <div className="help" style={{ marginTop: 0 }}><span>누적 {won(first)} / 목표 {won(B.target)}</span><span>{Math.round(pr * 100)}%</span></div>
        </div>

        {al.price ? (
          <div className="card">
            <h3><Icon name="activity" size={18} />보유 종목 등락 <span className="muted" style={{ fontWeight: 500 }}>전일 대비 · 예시</span></h3>
            {HOLDS.map((h, i) => (
              <div className={`tick ${i ? '' : 'first'}`} key={h.name}>
                <div><b>{h.name}</b><span>{h.kind}</span></div>{chg(h.chg)}
              </div>
            ))}
            <AiSay>삼성전자가 하루 만에 3% 넘게 빠졌지만 계획 자산이 아니고 전체 자산의 12% 수준이라 목표에 영향은 없어요. 추가 매수는 정기 매수일에 계획 비율대로만 하는 걸 권해요.</AiSay>
          </div>
        ) : <OffCard which="price" />}

        {al.rate ? (
          <div className="card">
            <h3><Icon name="bank" size={18} />더 높은 금리 상품이 나왔어요</h3>
            <div className="row first"><span className="k">A은행 정기적금 12개월 <span className="tagx">예시</span></span><span className="v">연 4.3%</span></div>
            <div className="row"><span className="k">지금 계획의 적금 금리</span><span className="v">연 3.5%</span></div>
            <div className="row"><span className="k">차이</span><span className="v" style={{ color: 'var(--p)' }}>+0.8%p</span></div>
            <AiSay>적금 {won(dJ, true)}을 이 상품으로 옮기면 {n}개월 동안 이자가 약 {won(extra)} 늘어요(세전, 우대 조건 충족 가정). 우대 조건에 급여이체·카드 실적이 있는지 먼저 확인하세요.</AiSay>
            <div className="muted" style={{ marginTop: 8 }}>출처: 금융감독원 금융상품통합비교공시 <span className="tagx plan">연동 예정</span> · 기준 시점은 실제 공시 시각으로 표시</div>
          </div>
        ) : <OffCard which="rate" />}

        {al.news ? (
          <div className="card">
            <h3><Icon name="news" size={18} />종목 뉴스 호재·악재 분석 <span className="muted" style={{ fontWeight: 500 }}>삼성전자 · 예시</span></h3>
            {NEWS.map(([t, cls, lab], i) => (
              <div className="news" key={t} style={i ? undefined : { borderTop: 0, paddingTop: 0 }}>
                <span>{t}</span><span className={`tag ${cls}`}>{lab}</span>
              </div>
            ))}
            <AiSay>악재 2건, 호재 1건. 오늘 하락은 메모리 가격 우려가 먼저 반영된 것으로 보여요. 단기 변동은 크지만 실적 발표(다음 달) 전까지는 판단을 미루는 게 낫겠어요.</AiSay>
            <div className="muted" style={{ marginTop: 8 }}>기사 제목은 예시입니다. 실제 서비스는 언론사 RSS·뉴스 검색 API로 종목 키워드를 모아 AI가 분류해요.</div>
          </div>
        ) : <OffCard which="news" />}

        {al.ma ? (
          <div className="card">
            <h3><Icon name="tup" size={18} />지표 전망 <span className="muted" style={{ fontWeight: 500 }}>이동평균선 · 예시</span></h3>
            <div className="hr">
              <div><b style={{ fontSize: 14 }}>KODEX 200</b> <span className="pill ok">단기 상승 흐름</span></div>
              <span className="muted">{upS.above ? '골든크로스' : '데드크로스'} {upS.days}일째</span>
            </div>
            <Spark arr={SERIES.up} />
            <div className="sub" style={{ marginTop: 8 }}>5일선이 20일선 위에 있고 간격이 벌어지는 중이에요. 계획대로 정기 매수를 이어가면 돼요.</div>
            <div className="hr" style={{ marginTop: 14 }}>
              <div><b style={{ fontSize: 14 }}>삼성전자</b> <span className="pill bad">단기 약세</span></div>
              <span className="muted">{dnS.above ? '골든크로스' : '데드크로스'} {dnS.days}일째</span>
            </div>
            <Spark arr={SERIES.dn} />
            <div className="sub" style={{ marginTop: 8 }}>5일선이 20일선 아래로 내려온 뒤 회복하지 못하고 있어요. 신규 매수는 5일선이 20일선을 다시 넘을 때까지 기다리는 편이 안전해요.</div>
            <div className="note"><Icon name="warn" size={16} /><div>전망은 지표 해석일 뿐 수익을 보장하지 않아요. 투자 판단과 책임은 본인에게 있어요.</div></div>
          </div>
        ) : <OffCard which="ma" />}

        <div className="card">
          <h3><Icon name="list" size={18} />오늘 할 일</h3>
          <div className="todo first"><span className="chk" /><div>{mm}월 30일 정기 매수 금액 확인: 채권 ETF {won(dC, true)} · 주식 ETF {won(dJu, true)}</div></div>
          <div className="todo"><span className="chk" /><div>A은행 정기적금 우대 조건 확인 후 갈아탈지 결정<span>이자 차이 약 {won(extra)} (세전)</span></div></div>
          <div className="todo"><span className="chk" /><div>삼성전자는 관망. 실적 발표 전까지 추가 매수 없음</div></div>
        </div>

        <div className="muted" style={{ textAlign: 'center', padding: '4px 0 8px' }}>
          이 브리핑은 매일 {st.time}에 자동으로 만들어져요 · <a href="#/settings">알림 설정</a> · <a href="#/data">AI가 학습하는 데이터</a>
        </div>
      </div>
      <TabBar cur="brief" />
    </>
  );
}

export { briefPlan, SERIES, ma, maState };
