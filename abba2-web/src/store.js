// 전역 상태와 목적 설정 진행도. 화면은 이 상태만 보고 그린다(서버 없음).
//
// React 전환 노트
//   기존 vanilla 판의 `S` 전역 객체와 액션(직접 대입)을 그대로 유지하고,
//   화면 갱신만 `render()` → `update()`(구독자 통지)로 바꿨다.
//   컴포넌트는 useStore()로 구독한다 — useSyncExternalStore 기반이라
//   S를 제자리에서 수정해도 React가 정확히 한 번 다시 그린다.
import { useSyncExternalStore } from 'react';
import { M, GOAL_LABEL } from './lib/config.js';
import { qFor } from './lib/questions.js';
import { go } from './routing.js';

const blank = () => ({ goalType: null, amount: null, months: null, monthsKnown: null, lump: null, income: null, expense: null, saving: null, risk: null, suggested: false });

const blankChat = () => ({ log: [], done: false, mode: 'expense', busy: false, pendingCustom: false });

const S = {
  a: blank(),
  chat: blankChat(),
  planRisk: null,
  brief: { time: '08:00', th: 3, alerts: { price: true, rate: true, news: true, ma: true } },
  demo: false,
  sheet: false,   // 화면 목록 시트 열림 여부
  toast: null,    // { id, msg }
  // AI 상세 계획. 실제 호출은 aiCoach.js가 하고 여기엔 결과만 둔다.
  ai: { on: true, status: 'idle', planKey: null, data: null, meta: null, error: null },
  // 계획에 대해 물어보기. 호출은 askPlan.js가 한다.
  ask: { items: [], busy: false, error: null },
};

// ---- 구독 ----
let version = 0;
const listeners = new Set();

function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

/** 상태를 바꾼 뒤 호출한다. 예전 render()와 같은 자리에 그대로 둔다. */
function update() { version += 1; listeners.forEach(fn => fn()); }

/** 화면이 S를 구독한다. 반환값은 늘 같은 S 객체(제자리 수정)다. */
function useStore() { useSyncExternalStore(subscribe, () => version, () => version); return S; }

// ---- 진행도 ----
const ORDER = ['goalType', 'amount', 'months', 'lump', 'income', 'expense', 'saving', 'risk'];

function included(id) { const a = S.a; if (id === 'amount') return a.goalType && a.goalType !== 'none'; if (id === 'saving') return a.expense != null; return true; }

function answered(id) { const a = S.a; if (id === 'months') return a.monthsKnown !== null; if (id === 'expense') return a.expense != null || a.saving != null; return a[id] != null; }

function currentQ() { for (const id of ORDER) if (included(id) && !answered(id)) return id; return null; }

function progress() { const ids = ORDER.filter(included); return { done: ids.filter(answered).length, total: ids.length }; }

function planReady() { return S.a.risk != null; }

// ---- 액션 ----
function startChat() { S.a = blank(); S.chat = blankChat(); S.planRisk = null; S.demo = false; update(); go('chat'); }

function fillExample() {
  S.a = Object.assign(blank(), { goalType: 'lump', amount: 3000 * M, months: 24, monthsKnown: true, lump: 0, income: 250 * M, expense: 160 * M, saving: 90 * M, risk: '중립형' });
  S.planRisk = '중립형'; S.demo = true;
  S.chat = Object.assign(blankChat(), { done: true });
  const pairs = [['goalType', '목돈 모으기'], ['amount', '3,000만 원'], ['months', '24개월'], ['lump', '없어요'], ['income', '250만 원'], ['expense', '160만 원'], ['saving', '90만 원'], ['risk', '중립형']];
  pairs.forEach(([id, label]) => { S.chat.log.push({ who: 'ai', kind: 'q', qid: id, text: qFor(id, S.a).text }); S.chat.log.push({ who: 'me', kind: 'a', qid: id, text: label }); });
  S.chat.log.push({ who: 'ai', kind: 'done', text: '필요한 정보는 다 모였어요. 추천 계획을 만들었어요.' });
  update(); go('plan');
}

function openSheet() { S.sheet = true; update(); }

function closeSheet() { S.sheet = false; update(); }

let toastId = 0, toastT = null;

function toast(msg) {
  S.toast = { id: ++toastId, msg }; update();
  clearTimeout(toastT);
  toastT = setTimeout(() => { S.toast = null; update(); }, 1600);
}

export {
  S, blank, blankChat, useStore, update,
  ORDER, GOAL_LABEL, included, answered, currentQ, progress, planReady,
  startChat, fillExample, openSheet, closeSheet, toast,
};
