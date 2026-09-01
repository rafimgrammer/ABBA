// 목적 설정 대화 — 질문 흐름, 입력 처리, 답변 저장·되돌리기.
import { M } from '../config.js';
import { $, fmt, won, esc } from '../utils.js';
import { ico } from '../icons.js';
import { S, ORDER, GOAL_LABEL, currentQ, progress } from '../state.js';
import { qFor, expenseChips, ackFor } from '../questions.js';
import { parseNum, validate } from '../validate.js';
import { topBar } from '../ui.js';
import { go, render } from '../router.js';

function vChat() {
  const p = progress();
  const c = S.chat;
  if (!c.log.length) { const q = qFor(currentQ()); c.log.push({ who: 'ai', kind: 'q', qid: q.id, text: q.text }); }
  const log = c.log.map(m => m.who === 'ai'
    ? `<div class="msg ai"><div class="av">AI</div><div class="bub">${esc(m.text)}</div></div>`
    : `<div class="msg me"><div class="bub">${esc(m.text)}</div></div>`).join('');
  const typing = c.busy ? `<div class="msg ai"><div class="av">AI</div><div class="bub typing"><i></i><i></i><i></i></div></div>` : '';
  return `${topBar('목적 설정', { backTo: 'start', right: `<span class="prog">${p.done}/${p.total}</span>`, bar: Math.round(p.done / p.total * 100) })}
  <div class="main" style="padding-bottom:230px"><div class="log" id="log">${log}${typing}</div></div>
  ${composer()}`;
}

function composer() {
  const c = S.chat;
  if (c.busy) return `<div class="composer" id="composer"><div class="muted" style="text-align:center;padding:8px 0">답변을 정리하고 있어요</div></div>`;
  if (c.done) return `<div class="composer" id="composer"><button class="btn" onclick="go('plan')">추천 계획 보기 ${ico('right', 18)}</button><div style="display:flex;justify-content:center;margin-top:8px"><button class="undo" onclick="undo()">${ico('undo', 14)} 마지막 답변 수정</button></div></div>`;
  const id = currentQ(); if (!id) return '';
  const q = qFor(id);
  const canUndo = c.log.some(m => m.kind === 'a');
  const undoBtn = canUndo ? `<button class="undo" onclick="undo()">${ico('undo', 14)} 이전 답변 수정</button>` : '';
  let chips = q.chips || [], seg = '';
  if (q.type === 'expense') {
    seg = `<div class="seg"><button class="${c.mode === 'expense' ? 'on' : ''}" onclick="setMode('expense')">월 지출로 답하기</button><button class="${c.mode === 'saving' ? 'on' : ''}" onclick="setMode('saving')">저축액으로 답하기</button></div>`;
    chips = expenseChips(c.mode);
  }
  const chipHtml = `<div class="chips">${chips.map(ch => `<button class="chip ${ch.d ? 'wide' : ''} ${ch.v === 'custom' && c.pendingCustom ? 'sel' : ''}" onclick="chip(${typeof ch.v === 'string' ? `'${ch.v}'` : ch.v})">${esc(ch.l)}${ch.d ? `<small>${esc(ch.d)}</small>` : ''}</button>`).join('')}</div>`;
  const input = q.type === 'chips' ? '' : `<div class="irow"><div class="field"><input id="num" inputmode="numeric" autocomplete="off" placeholder="${q.unit === '개월' ? '개월 수' : '금액'}" aria-label="${q.unit === '개월' ? '개월 수' : '금액(만 원)'}" oninput="live()" onkeydown="onNumKey(event)" onbeforeinput="onNumBeforeInput(event)" onfocus="onFocusNum()"><span>${q.unit}</span></div><button class="send" id="send" aria-label="보내기" onclick="submitInput()" disabled>${ico('up', 22)}</button></div><div class="help" id="help"><span id="helpL">${q.unit === '개월' ? '숫자만 입력' : '만 원 단위로 입력'}</span><span>${undoBtn}</span></div>`;
  return `<div class="composer" id="composer">${seg}${chipHtml}${input}${q.type === 'chips' ? `<div class="help"><span></span><span>${undoBtn}</span></div>` : ''}</div>`;
}

function afterChat() { const l = $('#log'); if (l) window.scrollTo(0, document.body.scrollHeight); }

function setMode(m) { S.chat.mode = m; S.chat.pendingCustom = false; render(); }

function onFocusNum() { setTimeout(() => { const el = $('#num'); if (el) el.scrollIntoView({ block: 'nearest' }); }, 60); }

// 입력할 때마다 도움말과 보내기 버튼 상태를 갱신한다(전체 render 대신).
function live() {
  const el = $('#num'); if (!el) return;
  const q = qFor(currentQ()); const { n, rejected } = parseNum(el); const r = validate(q, n, rejected);
  const help = $('#help'), hl = $('#helpL'), send = $('#send');
  if (hl) hl.textContent = r.ok && r.warn ? `${r.warn} · ${r.msg}` : r.msg;
  if (help) help.classList.toggle('err', !r.ok ? (n != null || !!rejected) : !!r.warn);
  if (send) send.disabled = !r.ok;
}

function submitInput() {
  const el = $('#num'); if (!el) return;
  const q = qFor(currentQ()); const { n, rejected } = parseNum(el); const r = validate(q, n, rejected);
  if (!r.ok) { live(); return; }
  answer(q, n);
}

function chip(v) {
  const q = qFor(currentQ()); if (!q) return;
  if (v === 'custom') { S.chat.pendingCustom = true; const el = $('#num'); if (el) { el.focus(); } document.querySelectorAll('.chip').forEach(b => b.classList.toggle('sel', b.textContent.trim() === '직접 입력')); return; }
  answer(q, v);
}

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
  c.busy = true; render();
  setTimeout(() => {
    c.log.push({ who: 'ai', kind: 'ack', qid: q.id, text: ackFor(ackId, store) });
    const next = currentQ();
    if (next) { const nq = qFor(next); c.log.push({ who: 'ai', kind: 'q', qid: nq.id, text: nq.text }); }
    else { c.done = true; c.log.push({ who: 'ai', kind: 'done', text: '필요한 정보는 다 모였어요. 추천 계획을 만들었어요.' }); }
    c.busy = false; render();
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
  c.done = false; c.pendingCustom = false; S.planRisk = null; render();
}

export { vChat, composer, afterChat, setMode, onFocusNum, live, submitInput, chip, answer, undo };
