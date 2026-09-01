// 목적 설정 대화 — 질문 흐름, 입력 처리, 답변 저장·되돌리기.
import { useEffect, useRef, useState } from 'react';
import { M } from '../lib/config.js';
import { fmt, won } from '../lib/utils.js';
import { Icon } from '../components/Icon.jsx';
import { TopBar } from '../components/Chrome.jsx';
import { NumField } from '../components/NumField.jsx';
import { S, ORDER, GOAL_LABEL, currentQ, progress, update, useStore } from '../store.js';
import { qFor, expenseChips, ackFor } from '../lib/questions.js';
import { go } from '../routing.js';

// ---- 액션 (상태를 바꾼 뒤 update()로 통지한다) ----

function answer(q, v) {
  const a = S.a, c = S.chat; let label, ackId = q.id, store = v;
  switch (q.id) {
    case 'goalType': a.goalType = v; label = GOAL_LABEL[v]; break;
    case 'amount': a.amount = v * M; store = a.amount; label = won(a.amount); break;
    case 'months': if (v === 'unknown') { a.months = null; a.monthsKnown = false; store = null; label = '아직 모르겠어요'; } else { a.months = v; a.monthsKnown = true; label = `${fmt(v)}개월`; } break;
    case 'lump': a.lump = v * M; store = a.lump; label = v === 0 ? '없어요' : won(a.lump); break;
    case 'income': a.income = v * M; store = a.income; label = won(a.income); break;
    case 'expense': if (c.mode === 'expense') { a.expense = v * M; store = a.expense; label = `지출 ${won(a.expense)}`; } else { a.saving = v * M; store = a.saving; label = `저축 ${won(a.saving)}`; ackId = 'savingDirect'; } break;
    case 'saving': a.saving = v * M; store = a.saving; label = won(a.saving); break;
    case 'risk': a.risk = v === 'unsure' ? '중립형' : v; S.planRisk = a.risk; label = v === 'unsure' ? '잘 모르겠어요' : v; break;
  }
  c.pendingCustom = false;
  c.log.push({ who: 'me', kind: 'a', qid: q.id, text: label });
  c.busy = true; update();
  setTimeout(() => {
    c.log.push({ who: 'ai', kind: 'ack', qid: q.id, text: ackFor(ackId, store) });
    const next = currentQ();
    if (next) { const nq = qFor(next); c.log.push({ who: 'ai', kind: 'q', qid: nq.id, text: nq.text }); }
    else { c.done = true; c.log.push({ who: 'ai', kind: 'done', text: '필요한 정보는 다 모였어요. 추천 계획을 만들었어요.' }); }
    c.busy = false; update();
  }, 380);
}

function undo() {
  const c = S.chat, a = S.a;
  let idx = -1; for (let i = c.log.length - 1; i >= 0; i--) if (c.log[i].kind === 'a') { idx = i; break; }
  if (idx < 0) return;
  const qid = c.log[idx].qid;
  c.log.splice(idx);
  const from = ORDER.indexOf(qid);
  ORDER.slice(from).forEach(id => { if (id === 'months') { a.months = null; a.monthsKnown = null; } else a[id] = null; });
  if (qid === 'expense') a.saving = null;
  c.done = false; c.pendingCustom = false; S.planRisk = null; update();
}

function setMode(m) { S.chat.mode = m; S.chat.pendingCustom = false; update(); }

// ---- 화면 ----

function UndoBtn({ label }) {
  return <button className="undo" onClick={undo}><Icon name="undo" size={14} /> {label}</button>;
}

function Composer() {
  const [focusSignal, setFocusSignal] = useState(0);
  const c = S.chat;

  if (c.busy) return <div className="composer" id="composer"><div className="muted" style={{ textAlign: 'center', padding: '8px 0' }}>답변을 정리하고 있어요</div></div>;

  if (c.done) return (
    <div className="composer" id="composer">
      <button className="btn" onClick={() => go('plan')}>추천 계획 보기 <Icon name="right" size={18} /></button>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}><UndoBtn label="마지막 답변 수정" /></div>
    </div>
  );

  const id = currentQ(); if (!id) return null;
  const q = qFor(id);
  const canUndo = c.log.some(m => m.kind === 'a');
  const undoBtn = canUndo ? <UndoBtn label="이전 답변 수정" /> : null;
  const chips = q.type === 'expense' ? expenseChips(c.mode) : (q.chips || []);

  function chip(v) {
    if (v === 'custom') { c.pendingCustom = true; update(); setFocusSignal(n => n + 1); return; }
    answer(q, v);
  }

  return (
    <div className="composer" id="composer">
      {q.type === 'expense' && (
        <div className="seg">
          <button className={c.mode === 'expense' ? 'on' : ''} onClick={() => setMode('expense')}>월 지출로 답하기</button>
          <button className={c.mode === 'saving' ? 'on' : ''} onClick={() => setMode('saving')}>저축액으로 답하기</button>
        </div>
      )}
      <div className="chips">
        {chips.map(ch => (
          <button key={String(ch.v) + ch.l}
            className={`chip ${ch.d ? 'wide' : ''} ${ch.v === 'custom' && c.pendingCustom ? 'sel' : ''}`}
            onClick={() => chip(ch.v)}>
            {ch.l}{ch.d && <small>{ch.d}</small>}
          </button>
        ))}
      </div>
      {q.type === 'chips'
        ? <div className="help"><span></span><span>{undoBtn}</span></div>
        : <NumField key={`${q.id}:${c.mode}`} q={q} onSubmit={n => answer(q, n)} undoBtn={undoBtn} focusSignal={focusSignal} />}
    </div>
  );
}

export function Chat() {
  useStore();
  const c = S.chat;
  const p = progress();
  const logRef = useRef(null);

  // 첫 진입이면 첫 질문을 깔아둔다(렌더 중 부수효과를 피해 effect에서 처리).
  useEffect(() => {
    if (c.log.length) return;
    const q = qFor(currentQ());
    c.log.push({ who: 'ai', kind: 'q', qid: q.id, text: q.text });
    update();
  }, [c]);

  // 새 말풍선이 붙을 때마다 맨 아래로.
  useEffect(() => { window.scrollTo(0, document.body.scrollHeight); }, [c.log.length, c.busy]);

  return (
    <>
      <TopBar title="목적 설정" backTo="start" bar={Math.round(p.done / p.total * 100)}
        right={<span className="prog">{p.done}/{p.total}</span>} />
      <div className="main" style={{ paddingBottom: 230 }}>
        <div className="log" id="log" ref={logRef}>
          {c.log.map((m, i) => m.who === 'ai'
            ? <div className="msg ai" key={i}><div className="av">AI</div><div className="bub">{m.text}</div></div>
            : <div className="msg me" key={i}><div className="bub">{m.text}</div></div>)}
          {c.busy && <div className="msg ai"><div className="av">AI</div><div className="bub typing"><i /><i /><i /></div></div>}
        </div>
      </div>
      <Composer />
    </>
  );
}
