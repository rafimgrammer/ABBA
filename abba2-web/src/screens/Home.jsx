// 랜딩 홈 — PC 우선 / 반응형. 앱 화면(430px 프레임)과 달리 풀와이드다.
//
// 미리보기 계산기는 시안의 복제 로직 대신 앱이 실제로 쓰는 ENGINE을 그대로 부른다.
// 랜딩에서 본 숫자와 가입 후 계획 화면의 숫자가 어긋나면 안 되기 때문이다.
import { useMemo, useState } from 'react';
import { Icon } from '../components/Icon.jsx';
import { ENGINE } from '../lib/engine.js';
import { M } from '../lib/config.js';
import { startChat, fillExample, toast } from '../store.js';

/** 구글 로고는 라인 아이콘이 아니라 색이 정해진 마크라 따로 그린다. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.27c0-.82-.07-1.6-.2-2.36H12v4.46h6.45a5.5 5.5 0 0 1-2.39 3.62v3h3.86c2.26-2.08 3.56-5.15 3.56-8.72z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.87-3a7.2 7.2 0 0 1-10.72-3.78H1.36v3.09A11.99 11.99 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.34 14.3a7.2 7.2 0 0 1 0-4.6V6.62H1.36a12 12 0 0 0 0 10.77l3.98-3.09z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.36 6.62l3.98 3.09A7.16 7.16 0 0 1 12 4.75z" />
    </svg>
  );
}

const login = () => toast('구글 로그인은 곧 연결돼요');

function Bullet({ children }) {
  return <li><Icon name="check" size={15} stroke={2.4} />{children}</li>;
}

const NAV = [['#features', '기능'], ['#how', '작동 방식'], ['#preview', '미리보기'], ['#briefing', '아침 브리핑'], ['#safety', '안전장치']];

function Nav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="nav">
      <div className="wrap">
        <div className="nav-in">
          <a className="brand" href="#main"><span className="dot" />ABBA <em>2.0</em></a>
          <nav className="nav-links" aria-label="주요 메뉴">
            {NAV.map(([h, t]) => <a key={h} href={h}>{t}</a>)}
          </nav>
          <div className="nav-right">
            <button className="btn btn-quiet" onClick={login}>로그인</button>
            <button className="btn btn-primary" onClick={login}>Google로 시작하기<Icon name="arrowRight" size={18} /></button>
            <button className="nav-toggle" type="button" aria-expanded={open} aria-controls="navDrawer" onClick={() => setOpen(v => !v)}>
              <Icon name="menu" size={17} />메뉴
            </button>
          </div>
        </div>
        <nav className={`nav-drawer neu-soft${open ? ' open' : ''}`} id="navDrawer" aria-label="모바일 메뉴" onClick={() => setOpen(false)}>
          {NAV.map(([h, t]) => <a key={h} href={h}>{t}</a>)}
          <button className="btn btn-primary drawer-cta" onClick={login}>Google로 시작하기</button>
        </nav>
      </div>
    </header>
  );
}

const BRIEF_ROWS = [
  ['trend', '보유 종목이 5일선을 넘었습니다', '삼성전자 71,500원 · 20일선까지 1.4% 남음', 'pos', '+1.2%'],
  ['bank2', '지금 계획보다 금리가 높은 적금', '12개월 3.85% · 월 납입 한도 50만 원', 'pos', '+0.35%p'],
  ['news', '내 종목 기사 3건 중 1건이 악재', '공정위 제재 관련 · 근거 문장까지 함께', 'neg', '악재'],
];

function HeroArt() {
  return (
    <div className="hero-art">
      <article className="mock mock-brief" aria-label="아침 브리핑 예시">
        <div className="mock-head">
          <span className="mock-title">오늘의 브리핑</span>
          <span className="mock-time">매일 08:00 발송</span>
        </div>
        {BRIEF_ROWS.map(([ic, t, d, kind, tag]) => (
          <div className="brief-row" key={t}>
            <span className="brief-ic"><Icon name={ic} size={16} /></span>
            <span className="brief-tx"><b>{t}</b><span>{d}</span></span>
            <span className={`tag tag-${kind}`}>{tag}</span>
          </div>
        ))}
      </article>

      <article className="mock mock-chat" aria-label="목적 설정 대화 예시">
        <div className="mock-head">
          <span className="mock-title">목적 설정</span>
          <span className="mock-time">7단계 중 5</span>
        </div>
        <p className="bubble ai">언제까지 모으고 싶으세요?</p>
        <p className="bubble me">36개월</p>
        <p className="bubble ai">한 달 지출은 보통 얼마인가요?{'\n'}지출 대신 매달 저축할 금액을 바로 알려주셔도 돼요.</p>
        <p className="bubble me">저축 140만 원</p>
        <div className="chat-plan">
          <span className="k">36개월 뒤 예상</span>
          <div className="v">5,353<small>만 원</small></div>
          <div className="split" aria-hidden="true">
            <i style={{ flex: 35, background: 'var(--lp-accent-deep)' }} />
            <i style={{ flex: 15, background: 'var(--lp-accent)' }} />
            <i style={{ flex: 20, background: 'var(--lp-accent-2)' }} />
            <i style={{ flex: 30, background: 'color-mix(in srgb, var(--lp-accent-2) 45%, var(--lp-surface))' }} />
          </div>
          <div className="legend">
            <span><i style={{ background: 'var(--lp-accent-deep)' }} />적금 35</span>
            <span><i style={{ background: 'var(--lp-accent)' }} />예금 15</span>
            <span><i style={{ background: 'var(--lp-accent-2)' }} />채권 20</span>
            <span><i style={{ background: 'color-mix(in srgb, var(--lp-accent-2) 45%, var(--lp-surface))' }} />주식 30</span>
          </div>
        </div>
      </article>
    </div>
  );
}

const PRINCIPLES = [
  ['01', '숫자는 코드가', '모든 금액·기간·비율은 결정적 계산 엔진이 만듭니다. AI가 금액을 지어내지 않습니다.'],
  ['02', '문장은 AI가', '계산 결과를 읽고 왜 이렇게 나왔는지 설명합니다. 매일 다른 상황에 맞춰 다시 씁니다.'],
  ['03', '검증은 다시 코드가', '문장 속 숫자와 표현을 코드가 다시 검사합니다. 두 번 걸리면 AI 문장을 버리고 계산값으로 만든 기본 설명으로 갑니다.'],
];

const FEATURES = [
  ['chatDots', '목적 설정 — 폼이 아니라 대화로',
    '기간·목표 금액·수입·지출을 한 번에 묻지 않습니다. 한 번에 하나씩 물어보고, 답한 내용에서 필요한 값을 알아서 뽑아냅니다.',
    ['수입과 지출을 받아 저축 가능액을 계산하고, 지출 대신 저축액으로 답해도 됩니다',
      '집·목돈·물건·아직 모름 — 목표 유형별로 묻는 것이 달라집니다',
      '음수·기호·범위 밖 입력은 세 겹으로 막습니다']],
  ['pie', '방법 추천 — 비율과 예상 수익까지',
    '성향과 기간에 맞춰 적금·예금·채권·주식 비율을 정하고, 세후 예상 총액과 목표까지의 부족분을 함께 보여줍니다.',
    ['1년 이내 목표면 주식 0%, 3년 이내면 최대 35%까지만',
      '부족하면 기간을 늘리는 안과 금액을 늘리는 안을 같이 제시',
      '대출은 집을 살 때만 계산합니다 (LTV 70% 가정)']],
  ['bulb', '금융정보 학습 — 기사를 대신 읽습니다  (연동 예정)',
    '내 종목·내 상품과 관련된 뉴스만 모아, 호재인지 악재인지 판단하고 그렇게 본 근거 문장을 함께 남길 계획입니다. 지금 화면은 예시 데이터로 흐름만 보여줍니다.',
    ['금융감독원 공시·한국은행 기준금리·KRX 시세를 매일 수집 (예정)',
      '분류 정확도를 라벨 세트로 측정하고 기록 (예정)',
      '기사 본문의 지시문은 제거한 뒤 데이터로만 취급 (예정)']],
  ['bell', '하루 한 번 브리핑 — 먼저 알려줍니다',
    '앱을 열어야 알 수 있는 정보는 결국 안 보게 됩니다. 그래서 매일 아침 한 번, 내 계획에 영향을 주는 것만 골라 보냅니다.',
    ['알림 항목을 끄고 켤 수 있고, 등락 기준도 ±2·3·5%로 고를 수 있습니다',
      '새벽 수집 → 아침 문장 생성 → 08:00 발송 (배치 연동 예정)',
      '카드 반응으로 다음 브리핑을 조정하고 월간 결산을 보내는 것은 예정입니다']],
];

const STEPS = [
  ['STEP 01 · 처음 한 번', '대화로 목적을 정합니다',
    '언제까지, 얼마를, 지금 수입과 지출은 얼마인지. 네 가지만 채우면 계획을 만들 수 있습니다. 답을 되돌려 고칠 수 있고, 로그인이 붙으면 중간까지 저장됩니다.',
    '평균 8회 문답 · 예시 값으로 건너뛰기 가능'],
  ['STEP 02 · 즉시', '계산 엔진이 계획을 만듭니다',
    '배분 비율, 세후 예상 총액, 목표까지의 부족분, 기간·금액 조정안을 한 화면에 만듭니다. 여기까지 AI는 한 번도 개입하지 않습니다.',
    '적금 단리 · 예금·채권·주식 월복리 · 이자소득세 15.4% 반영'],
  ['STEP 03 · 매일', '아침마다 브리핑이 옵니다',
    '시세·금리·상품·뉴스를 새벽에 모으고, 내 계획과 연결되는 것만 골라 문장으로 만들어 보냅니다. 반응을 누를수록 덜 시끄러워집니다.',
    '06:30 수집 → 07:20 생성 → 08:00 발송 (KST)'],
];

const RISKS = ['안정형', '중립형', '공격형'];
const KEYS = ['적금', '예금', '채권', '주식'];
const man = won => `${Math.round(won / M).toLocaleString('ko-KR')}만 원`;

/** 30초 미리보기 — 실제 서비스와 같은 계산 규칙(lib/engine.js)을 그대로 쓴다. */
function Calculator() {
  const [saving, setSaving] = useState(90);
  const [months, setMonths] = useState(24);
  const [risk, setRisk] = useState('중립형');

  const { w, p, rule } = useMemo(() => {
    const w = ENGINE.weights(risk, months);
    return {
      w,
      p: ENGINE.project(saving * M, 0, months, w),
      rule: ENGINE.ruleNote(risk, months) ?? '기간과 성향에 따라 비율이 자동으로 조정됩니다. 값을 움직여 보세요.',
    };
  }, [saving, months, risk]);

  return (
    <div className="calc">
      <div className="calc-panel neu">
        <div className="field">
          <div className="field-top">
            <label htmlFor="lpSaving">매달 저축할 수 있는 금액</label>
            <span className="field-val">{saving.toLocaleString('ko-KR')}<small>만 원</small></span>
          </div>
          <input id="lpSaving" type="range" min="10" max="300" step="5" value={saving}
            onChange={e => setSaving(Number(e.target.value))} />
        </div>
        <div className="field">
          <div className="field-top">
            <label htmlFor="lpMonths">모으는 기간</label>
            <span className="field-val">{months}<small>개월</small></span>
          </div>
          <input id="lpMonths" type="range" min="6" max="120" step="1" value={months}
            onChange={e => setMonths(Number(e.target.value))} />
        </div>
        <div className="field">
          <div className="field-top"><label id="lpRiskLabel">투자 성향</label></div>
          <div className="seg" role="group" aria-labelledby="lpRiskLabel">
            {RISKS.map(r => (
              <button key={r} type="button" aria-pressed={risk === r} onClick={() => setRisk(r)}>{r}</button>
            ))}
          </div>
        </div>
        <p className="assume">
          [가정] 연 수익률 적금 <code>3.5%</code> · 예금 <code>3.2%</code> · 채권 <code>4.0%</code> · 주식 <code>7.5%</code>, 이자·배당소득세 <code>15.4%</code>.
          2026-08 기준 가정값이며, 실제 서비스에서는 금융감독원 금융상품통합비교공시 값으로 대체합니다.
        </p>
      </div>

      <div className="calc-out neu">
        <div className="out-main">
          <span className="k">세후 예상 총액</span>
          <div className="v" aria-live="polite">{man(p.net)}</div>
        </div>
        <div className="out-sub">
          <div><span className="k">넣는 돈</span><div className="v">{man(p.principal)}</div></div>
          <div><span className="k">불어난 돈</span><div className="v" style={{ color: 'var(--lp-accent)' }}>{man(p.gain)}</div></div>
          <div><span className="k">평균 수익률</span><div className="v">{(ENGINE.blend(w) * 100).toFixed(2)}%</div></div>
        </div>

        <div className="alloc">
          {KEYS.map((k, i) => (
            <div className="alloc-row" key={k}>
              <span className="nm">{k}</span>
              <span className="alloc-bar"><i style={{ width: `${w[i]}%` }} /></span>
              <span className="pc">{w[i]}%</span>
            </div>
          ))}
        </div>

        <p className="calc-rule"><Icon name="info" size={16} /><span>{rule}</span></p>
        <div className="calc-go">
          <button className="btn btn-primary" onClick={startChat}>목표 정하기 시작<Icon name="arrowRight" size={18} /></button>
          <button className="btn btn-quiet" onClick={fillExample}>예시 값으로 계획 화면 바로 보기</button>
        </div>
      </div>
    </div>
  );
}

const BRIEF_CARDS = [
  ['trend', '주가 등락', '관심 종목의 전일 대비 변화와, 그 변화가 내 계획에서 갖는 의미를 함께 적습니다.',
    '"보유 종목이 어제보다 1.2% 올랐습니다. 주식 비중은 계획한 30% 안입니다."'],
  ['bank2', '고금리 상품', '지금 내 계획에 들어간 상품보다 조건이 나은 예·적금이 공시되면 알려줍니다.',
    '"12개월 3.85% 적금이 새로 나왔습니다. 지금 계획보다 0.35%p 높습니다."'],
  ['news', '기사 호재·악재', '내 종목 기사를 호재·악재·중립으로 나누고, 그렇게 판단한 근거 문장을 남깁니다.',
    '"3건 중 1건이 악재입니다. 공정위 제재 관련 내용입니다."'],
  ['pulse', '이동평균선 전망', '5일선과 20일선의 위치와 교차를 사실 그대로 전합니다. 사라거나 팔라고 하지 않습니다.',
    '"4일 전 5일선이 20일선을 위로 지났습니다. 판단은 직접 하세요."'],
];

const GUARDS = [
  ['shieldCheck', '매수·매도를 권하지 않습니다',
    '"수익 보장"·"반드시 오른다"·"매수를 권한다" 같은 표현을 생성 후 코드가 다시 검사합니다. 걸리면 다시 쓰게 하고, 두 번째도 걸리면 그 문장을 버립니다.'],
  ['clipCheck', 'AI가 쓴 숫자를 다시 검사합니다',
    '문장에 들어간 금액·비율·기간이 계산 결과에 있던 값인지 대조합니다. 하나라도 어긋나면 다시 쓰게 하고, 또 어긋나면 계산값으로 만든 기본 설명으로 바꿉니다.'],
  ['shieldX', '기사 속 지시문은 걸러냅니다  (연동 예정)',
    '뉴스 수집이 붙는 단계에서, 외부에서 가져온 글은 지시가 아니라 데이터로만 취급하도록 분리해 넣을 계획입니다. 지금은 뉴스 파이프라인 전이라 적용 전입니다.'],
  ['lockDot', '내 데이터는 내 계정 안에서만  (연동 예정)',
    '로그인·저장이 붙는 단계에서 모든 테이블에 행 단위 보안(RLS)을 걸 계획입니다. 지금 시안은 서버가 없어 입력값이 브라우저에만 있고, AI 키도 아직 화면 쪽에 있습니다 — 배포본에서는 서버를 거쳐 호출하도록 옮깁니다.'],
];

export function Home() {
  return (
    <div className="site">
      <a className="skip" href="#main">본문으로 건너뛰기</a>
      <Nav />

      <main id="main">
        <section className="hero">
          <div className="hero-bg" aria-hidden="true" />
          <div className="hero-cut" aria-hidden="true" />
          <div className="wrap hero-in">
            <div className="hero-copy">
              <span className="hero-badge">
                <b>2026 금융 AI Challenge</b> 출품작 · 시안 v2
                <span className="chev"><Icon name="right" size={13} stroke={2.4} /></span>
              </span>
              <h1>묻기 전에<br />먼저 알려주는<br /><em>재테크 코치</em></h1>
              <p className="hero-lede">
                목표를 대화로 말하면 적금·예금·채권·주식 비율을 계산해 드립니다.
                그다음부터는 매일 아침, 내 계획과 관련된 것만 골라서 먼저 알려드립니다.
              </p>
              <div className="hero-cta">
                <button className="btn btn-google btn-lg" onClick={login}><GoogleMark />Google로 시작하기</button>
                <a className="btn btn-quiet btn-lg" href="#preview"><Icon name="columns" size={18} />30초 미리보기</a>
              </div>
              <p className="hero-note">
                <Icon name="lock" size={15} />
                가입은 구글 계정 하나면 끝납니다. 계좌 연결이나 자산 정보를 요구하지 않습니다.
              </p>
            </div>
            <HeroArt />
          </div>
        </section>

        <div className="wrap principles">
          <div className="neu principles-in">
            {PRINCIPLES.map(([n, t, d]) => (
              <div className="principle" key={n}>
                <span className="n">{n}</span>
                <div><b>{t}</b><p>{d}</p></div>
              </div>
            ))}
          </div>
        </div>

        <section className="sec" id="features">
          <div className="wrap">
            <div className="sec-head">
              <span className="eyebrow">무엇을 하는가</span>
              <h2>재테크에서 막히는 네 지점을,<br />네 가지 기능으로 나눠 풀었습니다</h2>
              <p className="lede">"뭘 모르는지도 모르겠는" 상태에서 시작해, 매일 챙겨보게 되는 습관까지 이어지도록 설계했습니다.</p>
            </div>
            <div className="feat">
              {FEATURES.map(([ic, t, d, items]) => (
                <article className="card neu" key={t}>
                  <span className="card-ic"><Icon name={ic} size={24} /></span>
                  <h3>{t}</h3>
                  <p>{d}</p>
                  <ul>{items.map(x => <Bullet key={x}>{x}</Bullet>)}</ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="sec sec-alt" id="how">
          <div className="wrap">
            <div className="sec-head">
              <span className="eyebrow">작동 방식</span>
              <h2>3분이면 계획이 나오고,<br />다음 날부터는 알아서 굴러갑니다</h2>
              <p className="lede">순서가 있는 과정이라 번호를 붙였습니다. 1번은 처음 한 번, 3번은 매일 반복됩니다.</p>
            </div>
            <div className="steps">
              {STEPS.map(([num, t, d, meta]) => (
                <article className="step neu" key={num}>
                  <span className="num">{num}</span>
                  <h3>{t}</h3>
                  <p>{d}</p>
                  <div className="meta">{meta}</div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="sec" id="preview">
          <div className="wrap">
            <div className="sec-head">
              <span className="eyebrow">30초 미리보기</span>
              <h2>가입 전에, 계산부터 해보세요</h2>
              <p className="lede">아래는 실제 서비스가 쓰는 계산 엔진과 같은 규칙입니다. 값을 움직이면 바로 다시 계산됩니다.</p>
            </div>
            <Calculator />
          </div>
        </section>

        <section className="sec sec-alt" id="briefing">
          <div className="wrap">
            <div className="sec-head">
              <span className="eyebrow">매일 아침 08:00</span>
              <h2>브리핑에는 네 종류의 카드가 담깁니다</h2>
              <p className="lede">모든 카드가 매일 오지는 않습니다. 그날 실제로 변한 것이 있을 때만 만들어집니다.</p>
            </div>
            <div className="brief-grid">
              {BRIEF_CARDS.map(([ic, t, d, ex]) => (
                <article className="bcard neu" key={t}>
                  <span className="card-ic"><Icon name={ic} size={20} /></span>
                  <h3>{t}</h3>
                  <p>{d}</p>
                  <p className="ex">{ex}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="sec" id="safety">
          <div className="wrap">
            <div className="sec-head">
              <span className="eyebrow">안전장치</span>
              <h2>금융 서비스에서 AI가<br />하면 안 되는 일을 먼저 정했습니다</h2>
              <p className="lede">기능을 만들기 전에 금지선을 코드로 박아 두었습니다. 아래는 전부 자동으로 검사됩니다.</p>
            </div>
            <div className="guard">
              {GUARDS.map(([ic, t, d]) => (
                <article className="guard-item neu-soft" key={t}>
                  <span className="card-ic"><Icon name={ic} size={21} /></span>
                  <div><h3>{t}</h3><p>{d}</p></div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="sec" style={{ paddingTop: 0 }}>
          <div className="wrap">
            <div className="neu close" id="login">
              <h2>오늘 정한 목표가,<br />내일 아침부터 따라옵니다</h2>
              <p>구글 계정으로 시작하면 계획이 저장되고, 다음 날부터 브리핑이 도착합니다. 계좌 연결은 필요하지 않습니다.</p>
              <div className="hero-cta">
                <button className="btn btn-google btn-lg" onClick={login}><GoogleMark />Google로 시작하기</button>
                <a className="btn btn-quiet btn-lg" href="#preview">먼저 계산만 해보기</a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="foot">
        <div className="wrap foot-in">
          <div>
            <a className="brand" href="#main"><span className="dot" />ABBA <em>2.0</em></a>
            <p style={{ marginTop: 10 }}>2026 금융 AI Challenge 출품작 · 홈 화면 시안 v2</p>
          </div>
          <p style={{ maxWidth: '52ch' }}>
            화면에 보이는 금액은 가정 수익률에 따른 시뮬레이션이며 수익을 보장하지 않습니다.
            투자 판단과 그 결과는 이용자 본인에게 있습니다.
          </p>
        </div>
      </footer>
    </div>
  );
}
