// 화면 공통 조각 — 상단 띠·헤더·탭바·화면 목록 시트·토스트.
import { DOCS, APP } from '../lib/config.js';
import { Icon } from './Icon.jsx';
import { S, useStore, startChat, fillExample, openSheet, closeSheet, planReady } from '../store.js';
import { go } from '../routing.js';

export function Strip() {
  return (
    <div className="strip">
      <div><b>{APP.name}</b> 시안 v{APP.version} · 팀 공유판 · 예시 데이터</div>
      <button onClick={openSheet}>화면 목록</button>
    </div>
  );
}

/** title 외에는 전부 선택 인자다. back={false}면 뒤로 버튼 대신 여백만 둔다. */
export function TopBar({ title, back = true, backTo, right, bar }) {
  return (
    <>
      <div className="top">
        {back === false
          ? <span style={{ width: 8 }} />
          : <button className="ib" aria-label="뒤로" onClick={() => backTo ? go(backTo) : history.back()}><Icon name="back" /></button>}
        <h2>{title}</h2>
        {right}
      </div>
      {bar != null && <div className="bar"><i style={{ width: `${bar}%` }} /></div>}
    </>
  );
}

const TABS = [['plan', 'home', '계획'], ['brief', 'bell', '브리핑'], ['settings', 'sliders', '설정']];

export function TabBar({ cur }) {
  const on = cur === 'data' ? 'settings' : cur;
  return (
    <nav className="tabbar">
      {TABS.map(([r, i, l]) => (
        <a key={r} href={`#/${r}`} className={on === r ? 'on' : ''}><Icon name={i} size={22} />{l}</a>
      ))}
    </nav>
  );
}

function SheetLink({ href, label, desc, onClick }) {
  return <a href={href} onClick={onClick}>{label}<span>{desc}</span></a>;
}

export function Sheet() {
  const s = useStore();
  if (!s.sheet) return null;
  const ready = planReady();
  return (
    <div className="ov" onClick={e => { if (e.target === e.currentTarget) closeSheet(); }}>
      <div className="sheet">
        <h4>화면 목록
          <button className="ib" style={{ border: 0, background: 'transparent' }} aria-label="닫기" onClick={closeSheet}><Icon name="x" size={20} /></button>
        </h4>
        <SheetLink href="#/" label="시작" desc="서비스 소개" onClick={closeSheet} />
        <SheetLink href="#/chat" label="1 목적 설정 대화" desc="AI가 묻고 답하는 흐름"
          onClick={() => { closeSheet(); if (!S.chat.log.length) startChat(); }} />
        <SheetLink href="#/plan" label="2 추천 계획" desc={ready ? '내 답변 기준' : '예시 값으로 열기'}
          onClick={() => { closeSheet(); if (!ready) fillExample(); }} />
        <SheetLink href="#/brief" label="4 오늘의 브리핑" desc="하루 한 번 알림 예시" onClick={closeSheet} />
        <SheetLink href="#/data" label="3 AI가 학습하는 금융 정보" desc="데이터 출처·갱신 주기" onClick={closeSheet} />
        <SheetLink href="#/settings" label="알림 설정" desc="시간·항목·연결" onClick={closeSheet} />
        <h4 style={{ marginTop: 14 }}>팀 문서 <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>새 창으로 열림</span></h4>
        {DOCS.map(d => (
          <a key={d.url} className="doc" href={d.url} target="_blank" rel="noopener">{d.title}<span>{d.desc}</span></a>
        ))}
        <div className="muted" style={{ padding: '10px 4px 0' }}>파일 원본: 프로젝트 폴더 <b>09_ABBA 2.0</b></div>
      </div>
    </div>
  );
}

export function Toast() {
  const s = useStore();
  if (!s.toast) return null;
  return <div id="toast" className="toast">{s.toast.msg}</div>;
}
