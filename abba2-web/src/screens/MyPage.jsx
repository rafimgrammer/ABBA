// 마이페이지 — 이 서비스가 나에 대해 알고 있는 정보를 한 화면에 모아 보여준다.
// 목표 설정 답변과 브리핑 설정은 store.js가 로그인 시 자동으로 서버(user_state
// 테이블)에서 불러오므로, 이 화면은 그 값을 그리기만 하면 된다 — 다시 입력받지 않는다.
//
// 그래프 3종
//   1) 성장 곡선(AreaChart)   — 0개월부터 목표 기간까지, 저축액이 어떻게 불어나는지
//   2) 자산 배분(도넛)         — 적금·예금·채권·주식 비율
//   3) 목표 대비 진행률(바)    — 예상 총액이 목표 금액의 몇 %인지
// 셋 다 lib/engine.js의 ENGINE을 그대로 불러 계산한다. 계획 화면과 다른 숫자가
// 나올 일이 없다.
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Icon } from '../components/Icon.jsx';
import { TopBar, TabBar } from '../components/Chrome.jsx';
import { S, useStore, GOAL_LABEL, planReady, startChat, logout } from '../store.js';
import { ENGINE } from '../lib/engine.js';
import { LTV } from '../lib/config.js';
import { won } from '../lib/utils.js';
import { go } from '../routing.js';

const TEAL = ['#0F6E56', '#1D9E75', '#54C7A2', '#A9E4CE'];   // 적금·예금·채권·주식
const ALLOC_KEYS = ['적금', '예금', '채권', '주식'];

function displayName(user) {
  return user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || '내 계정';
}

function formatDate(iso) {
  if (!iso) return '알 수 없음';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '알 수 없음';
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
}

function formatDateTime(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${formatDate(iso)} ${hh}:${mm}`;
}

/** house/lump/item 목표의 목표 금액을 추정한다. coach.js의 factSheet과 같은 규칙(집은
 * 자기자본 = 집값 × (1-LTV))을 쓴다. 'none'(뚜렷한 목표 없음)은 비교할 목표가 없다. */
function impliedTarget(a) {
  if (a.goalType === 'house') return a.amount * (1 - LTV);
  if (a.goalType === 'lump' || a.goalType === 'item') return a.amount;
  return null;
}

/** 0개월부터 목표 기간까지, 최대 10개 지점을 뽑아 성장 곡선 데이터를 만든다. */
function buildSeries(a, months, w) {
  if (!months) return [];
  const step = Math.max(1, Math.round(months / Math.min(months, 9)));
  const pts = [{ month: 0, total: a.lump || 0 }];
  for (let n = step; n < months; n += step) {
    pts.push({ month: n, total: ENGINE.project(a.saving || 0, a.lump || 0, n, w).net });
  }
  pts.push({ month: months, total: ENGINE.project(a.saving || 0, a.lump || 0, months, w).net });
  return pts;
}

function Row({ label, value }) {
  return (
    <div className="mp-row">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

function StatTile({ label, value, accent }) {
  return (
    <div style={{
      flex: 1, minWidth: 0, background: accent ? '#EAF7F1' : '#F5F6F6', borderRadius: 14,
      padding: '12px 10px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 11, color: '#7A8C86', marginBottom: 4, whiteSpace: 'nowrap' }}>{label}</div>
      <div style={{
        fontSize: accent ? 16 : 13, fontWeight: 700, color: accent ? '#0F6E56' : '#222',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{value}</div>
    </div>
  );
}

function SectionTitle({ icon, children }) {
  return (
    <h3 style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, margin: '0 0 12px' }}>
      <Icon name={icon} size={17} />{children}
    </h3>
  );
}

export function MyPage() {
  useStore();
  const user = S.user;
  const a = S.a;
  const started = a.goalType != null;
  const ready = planReady();

  let calc = null, series = [];
  if (ready && a.months) {
    const w = ENGINE.weights(a.risk, a.months);
    const p = ENGINE.project(a.saving || 0, a.lump || 0, a.months, w);
    calc = { w, p };
    series = buildSeries(a, a.months, w);
  }

  const target = calc ? impliedTarget(a) : null;
  const pct = calc && target ? Math.min(100, Math.round((calc.p.net / target) * 100)) : null;
  const allocData = calc ? ALLOC_KEYS.map((k, i) => ({ name: k, value: calc.w[i] })).filter(d => d.value > 0) : [];
  const lastSaved = formatDateTime(S.lastSavedAt);

  return (
    <>
      <TopBar title="마이페이지" backTo="settings" />
      <div className="main fade cards" style={{ paddingBottom: 100 }}>

        {/* 프로필 */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 46, height: 46, borderRadius: '50%', background: '#0F6E56', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, flexShrink: 0,
          }}>
            {displayName(user).charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{displayName(user)}</div>
            <div style={{ fontSize: 12, color: '#7A8C86', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.email} · {formatDate(user?.created_at)} 가입
            </div>
          </div>
          <button
            className="btn btn-quiet"
            style={{ padding: '6px 12px', fontSize: 13, whiteSpace: 'nowrap', width: 'auto', flex: '0 0 auto' }}
            onClick={logout}
          >
            로그아웃
          </button>
        </div>

        {/* 목표 설정 안 했을 때 */}
        {!started && (
          <div className="card" style={{ textAlign: 'center', padding: '28px 16px' }}>
            <Icon name="chatDots" size={28} />
            <div style={{ fontWeight: 700, margin: '10px 0 4px' }}>아직 목표를 설정하지 않았어요</div>
            <div className="sub" style={{ marginBottom: 14 }}>대화로 목표를 정하면 여기에 예상 결과와 그래프가 채워져요.</div>
            <button className="btn btn-primary" onClick={() => go('chat')}>목적 설정 시작하기<Icon name="arrowRight" size={16} /></button>
          </div>
        )}

        {/* 목표 설정 중(아직 투자 성향까지 안 끝남) */}
        {started && !ready && (
          <div className="card" style={{ textAlign: 'center', padding: '24px 16px' }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>목표 설정이 진행 중이에요</div>
            <div className="sub" style={{ marginBottom: 14 }}>마저 답변하면 예상 결과와 그래프를 볼 수 있어요.</div>
            <button className="btn btn-primary" onClick={() => go('chat')}>이어서 답하기<Icon name="arrowRight" size={16} /></button>
          </div>
        )}

        {/* 요약 스탯 + 목표 대비 진행률 */}
        {calc && (
          <div className="card">
            <SectionTitle icon="pie">요약</SectionTitle>
            <div style={{ display: 'flex', gap: 8 }}>
              <StatTile label="세후 예상 총액" value={won(calc.p.net)} accent />
              <StatTile label="넣는 돈" value={won(calc.p.principal)} />
              <StatTile label="불어난 돈" value={won(calc.p.gain)} />
            </div>

            {pct != null && (
              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#7A8C86', marginBottom: 6 }}>
                  <span>목표 금액 {won(target)} 대비</span>
                  <b style={{ color: '#0F6E56' }}>{pct}%</b>
                </div>
                <div style={{ height: 10, borderRadius: 6, background: '#EEF1F0', overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', borderRadius: 6, background: 'linear-gradient(90deg,#0F6E56,#54C7A2)', transition: 'width .4s' }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* 성장 곡선 */}
        {calc && series.length > 1 && (
          <div className="card">
            <SectionTitle icon="clock">{a.months}개월 동안 이렇게 불어나요</SectionTitle>
            <div style={{ width: '100%', height: 180 }}>
              <ResponsiveContainer>
                <AreaChart data={series} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="mpGrow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1D9E75" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#1D9E75" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F0" vertical={false} />
                  <XAxis dataKey="month" tickFormatter={m => `${m}M`} tick={{ fontSize: 11, fill: '#9AA6A1' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={v => `${Math.round(v / 10000)}만`} tick={{ fontSize: 11, fill: '#9AA6A1' }} axisLine={false} tickLine={false} width={46} />
                  <Tooltip formatter={v => won(v)} labelFormatter={m => `${m}개월 뒤`} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Area type="monotone" dataKey="total" stroke="#0F6E56" strokeWidth={2} fill="url(#mpGrow)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* 자산 배분 도넛 */}
        {calc && allocData.length > 0 && (
          <div className="card">
            <SectionTitle icon="pie">자산 배분 — {a.risk}</SectionTitle>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 110, height: 110, flexShrink: 0 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={allocData} dataKey="value" nameKey="name" innerRadius={32} outerRadius={52} paddingAngle={2} stroke="none">
                      {allocData.map(d => <Cell key={d.name} fill={TEAL[ALLOC_KEYS.indexOf(d.name)]} />)}
                    </Pie>
                    <Tooltip formatter={v => `${v}%`} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {ALLOC_KEYS.map((k, i) => calc.w[i] > 0 && (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '3px 0' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: TEAL[i], flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>{k}</span>
                    <b>{calc.w[i]}%</b>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 내가 답한 값 */}
        {started && (
          <div className="card">
            <SectionTitle icon="chatDots">내가 답한 값</SectionTitle>
            <Row label="목표" value={GOAL_LABEL[a.goalType] ?? '-'} />
            {a.amount != null && <Row label="목표 금액" value={won(a.amount)} />}
            {a.months != null && <Row label="기간" value={`${a.months}개월`} />}
            {a.lump != null && <Row label="이미 모아둔 돈" value={won(a.lump)} />}
            {a.income != null && <Row label="월 수입" value={won(a.income)} />}
            {a.expense != null && <Row label="월 지출" value={won(a.expense)} />}
            {a.saving != null && <Row label="월 저축" value={won(a.saving)} />}
            {a.risk != null && <Row label="투자 성향" value={a.risk} />}
            <button className="btn btn-quiet" style={{ marginTop: 12, width: '100%' }} onClick={startChat}>
              처음부터 다시 설정하기
            </button>
          </div>
        )}

        {/* 브리핑 알림 설정 */}
        <div className="card">
          <SectionTitle icon="bell">브리핑 알림 설정</SectionTitle>
          <Row label="발송 시간" value={S.brief.time} />
          <Row label="등락 기준" value={`±${S.brief.th}%`} />
          <Row label="시세 알림" value={S.brief.alerts.price ? '켜짐' : '꺼짐'} />
          <Row label="금리 알림" value={S.brief.alerts.rate ? '켜짐' : '꺼짐'} />
          <Row label="뉴스 알림" value={S.brief.alerts.news ? '켜짐' : '꺼짐'} />
          <Row label="이동평균선 알림" value={S.brief.alerts.ma ? '켜짐' : '꺼짐'} />
          <button className="btn btn-quiet" style={{ marginTop: 12, width: '100%' }} onClick={() => go('settings')}>
            알림 설정 바꾸기
          </button>
        </div>

        {/* AI 상세 계획 상태 */}
        <div className="card">
          <SectionTitle icon="info">AI 상세 계획</SectionTitle>
          <Row label="사용 여부" value={S.ai.on ? '켜짐' : '꺼짐'} />
          <Row label="상태" value={{ idle: '대기', loading: '생성 중', ok: '생성됨', error: '오류' }[S.ai.status] ?? S.ai.status} />
          {S.ai.meta?.model && <Row label="마지막 사용 모델" value={S.ai.meta.model} />}
        </div>

        {lastSaved && (
          <div className="muted" style={{ textAlign: 'center', fontSize: 11, padding: '4px 0 0' }}>
            마지막 저장 {lastSaved} · 다음에 다시 열어도 그대로 남아있어요
          </div>
        )}
      </div>
      <TabBar cur="mypage" />
    </>
  );
}