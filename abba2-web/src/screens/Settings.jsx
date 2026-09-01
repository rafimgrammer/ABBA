// 설정 — 브리핑 시간·알림 항목·연결·내 목표.
import { useState } from 'react';
import { won } from '../lib/utils.js';
import { Icon } from '../components/Icon.jsx';
import { TopBar, TabBar } from '../components/Chrome.jsx';
import { S, GOAL_LABEL, startChat, planReady, update, useStore, toast } from '../store.js';
import { getKey, setKey, usingBuiltIn, hasKey, maskKey } from '../lib/apiKey.js';
import { toggleAi, resetCoach } from '../aiCoach.js';
import { MODELS } from '../lib/gemini.js';

function toggleAlert(k) { S.brief.alerts[k] = !S.brief.alerts[k]; update(); }

function setTime(t) { S.brief.time = t; update(); }

function setTh(t) { S.brief.th = t; update(); }

const TIMES = ['07:00', '08:00', '09:00', '21:00'];

function Switch({ k }) {
  const on = S.brief.alerts[k];
  return <button className={`sw ${on ? 'on' : ''}`} role="switch" aria-checked={on} aria-label={k} onClick={() => toggleAlert(k)} />;
}

function SRow({ first, title, desc, children }) {
  return (
    <div className={`srow${first ? ' first' : ''}`}>
      <div><b>{title}</b><span>{desc}</span></div>
      {children}
    </div>
  );
}

/** AI 상세 계획 켜기/끄기와 개인 API 키. 키를 넣으면 이 브라우저에서만 그 키를 쓴다. */
function AiCard() {
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState(false);
  const built = usingBuiltIn();
  const none = !hasKey();

  function save() {
    setKey(draft.trim());
    setDraft(''); setEditing(false); resetCoach();
    toast(draft.trim() ? '내 API 키로 바꿨어요' : '기본 키로 되돌렸어요');
  }

  return (
    <div className="card">
      <h3><Icon name="sparkles" size={18} />AI 상세 계획</h3>
      <SRow first title="계획 화면에 AI 설명 넣기" desc="진단·실행 순서·위험·중간 점검을 문장으로 정리해요">
        <button className={`sw ${S.ai.on ? 'on' : ''}`} role="switch" aria-checked={S.ai.on} aria-label="ai" onClick={toggleAi} />
      </SRow>
      <SRow title="쓰는 모델" desc="앞 모델이 막히면 다음 모델로 넘어가요">
        <span className="muted" style={{ textAlign: 'right' }}>{MODELS[0]}</span>
      </SRow>
      <SRow title="API 키" desc={none ? '아직 키가 없어요. 넣어야 AI 상세 계획이 만들어져요' : built ? '빌드에 넣어둔 키를 쓰는 중이에요' : '이 브라우저에 저장한 내 키를 쓰는 중이에요'}>
        {editing
          ? <button className="btn sm" onClick={save}>저장</button>
          : <button className={`btn sm${none ? '' : ' ghost'}`} onClick={() => setEditing(true)}>{none ? '키 넣기' : '바꾸기'}</button>}
      </SRow>
      {editing && (
        <div className="irow" style={{ marginTop: 8 }}>
          <div className="field">
            <input value={draft} onChange={e => setDraft(e.target.value)} placeholder="비우면 공용 키로 되돌아가요"
              autoComplete="off" spellCheck="false" aria-label="Gemini API 키"
              style={{ textAlign: 'left', fontSize: 13, fontWeight: 400 }} />
          </div>
          <button className="btn sm ghost" onClick={() => { setEditing(false); setDraft(''); }}>취소</button>
        </div>
      )}
      <div className="muted" style={{ marginTop: 8 }}>지금 키: {maskKey(getKey())}</div>
      <div className="note">
        <Icon name="info" size={16} />
        <div>키는 저장소에 올라가지 않아요. 빌드할 때 <code>.env.local</code>에서 읽거나, 여기서 넣으면 이 브라우저에만 저장됩니다. 배포본에서는 백엔드를 거쳐 호출하도록 옮길 예정이에요.</div>
      </div>
    </div>
  );
}

export function Settings() {
  useStore();
  const st = S.brief;
  const ready = planReady();
  return (
    <>
      <TopBar title="설정" back={false} />
      <div className="main fade cards" style={{ paddingBottom: 100 }}>
        <div className="card">
          <h3><Icon name="bell" size={18} />브리핑 알림</h3>
          <SRow first title="브리핑 시간" desc="하루 한 번, 이 시간에 푸시로 보내요"><span className="mid">{st.time}</span></SRow>
          <div className="mini">{TIMES.map(t => <button key={t} className={st.time === t ? 'on' : ''} onClick={() => setTime(t)}>{t}</button>)}</div>
        </div>

        <div className="card">
          <h3><Icon name="list" size={18} />알림 항목</h3>
          <SRow first title="보유 종목 등락" desc="하루 등락이 기준을 넘으면 알려요"><Switch k="price" /></SRow>
          <div className="mini" style={{ marginTop: 0, marginBottom: 6 }}>
            {[2, 3, 5].map(t => <button key={t} className={st.th === t ? 'on' : ''} onClick={() => setTh(t)}>±{t}%</button>)}
          </div>
          <SRow title="더 높은 금리 상품" desc="내 적금·예금보다 0.5%p 이상 높은 상품이 나오면"><Switch k="rate" /></SRow>
          <SRow title="종목 뉴스 호재·악재 분석" desc="보유 종목 기사를 AI가 분류해 요약"><Switch k="news" /></SRow>
          <SRow title="지표 전망" desc="이동평균선 등 지표로 단기 흐름 안내"><Switch k="ma" /></SRow>
        </div>

        <AiCard />

        <div className="card">
          <h3><Icon name="link" size={18} />연결</h3>
          <SRow first title="은행 계좌 연동" desc="마이데이터로 잔액·자동이체 확인"><span className="pill">예정</span></SRow>
          <SRow title="증권 계좌 연동" desc="보유 종목·평가금액 자동 반영"><span className="pill">예정</span></SRow>
          <SRow title="AI가 학습하는 금융 정보" desc="데이터 출처와 갱신 주기">
            <a href="#/data" className="link" style={{ display: 'flex', alignItems: 'center' }}>보기 <Icon name="right" size={16} /></a>
          </SRow>
        </div>

        <div className="card">
          <h3><Icon name="target" size={18} />내 목표</h3>
          {ready
            ? <SRow first
                title={S.a.goalType === 'house' ? `집 사기 · 집값 ${won(S.a.amount)}` : `${GOAL_LABEL[S.a.goalType]} ${won(S.a.amount)}`}
                desc={`${S.a.months ? `${S.a.months}개월` : '기간 미정'} · 월 ${won(S.a.saving)} · ${S.planRisk || S.a.risk}`}>
                <a href="#/plan" className="link" style={{ display: 'flex', alignItems: 'center' }}>계획 <Icon name="right" size={16} /></a>
              </SRow>
            : <SRow first title="아직 목표가 없어요" desc="대화로 목표를 정하면 브리핑이 내 계획 기준으로 바뀌어요" />}
          <SRow title="목표 다시 정하기" desc="처음부터 대화를 다시 시작해요">
            <button className="btn sm ghost" onClick={startChat}>다시 시작</button>
          </SRow>
        </div>
      </div>
      <TabBar cur="settings" />
    </>
  );
}
