// 전역 상태와 목적 설정 진행도. 화면은 이 상태만 보고 그린다(서버 없음).
//
// React 전환 노트
//   기존 vanilla 판의 `S` 전역 객체와 액션(직접 대입)을 그대로 유지하고,
//   화면 갱신만 `render()` → `update()`(구독자 통지)로 바꿨다.
//   컴포넌트는 useStore()로 구독한다 — useSyncExternalStore 기반이라
//   S를 제자리에서 수정해도 React가 정확히 한 번 다시 그린다.
//
// 저장(persist) 노트
//   S.a(목표 설정 답변)와 S.brief(브리핑 설정)는 로그인한 사용자마다 Supabase의
//   user_state 테이블 한 행에 그대로 저장된다. 로그인하면 그 행을 불러와 S에
//   덮어쓰고, 그 뒤로는 update()가 호출될 때마다(=화면이 뭔가 바뀔 때마다) 잠시
//   기다렸다가(무한 재저장을 막으려고) 자동으로 다시 저장한다.
import { useSyncExternalStore } from 'react';
import { M, GOAL_LABEL } from './lib/config.js';
import { qFor } from './lib/questions.js';
import { go } from './routing.js';
import { supabase } from './supabaseClient.js';

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
  // 로그인한 사용자. 로그아웃 상태면 null.
  user: null,
  // 서버에 마지막으로 저장된 시각 (마이페이지에 "마지막 저장" 표시용). ISO 문자열.
  lastSavedAt: null,
};

// ---- 구독 ----
let version = 0;
const listeners = new Set();

function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

/** 구독자에게만 알린다 — 서버 저장을 새로 예약하지 않는다. 저장 완료 후 통지할 때 쓴다. */
function notify() { version += 1; listeners.forEach(fn => fn()); }

/** 상태를 바꾼 뒤 호출한다. 예전 render()와 같은 자리에 그대로 둔다.
 * 화면 통지 + (로그인 상태면) 서버 자동 저장 예약을 함께 한다. */
function update() { notify(); scheduleSave(); }

/** 화면이 S를 구독한다. 반환값은 늘 같은 S 객체(제자리 수정)다. */
function useStore() { useSyncExternalStore(subscribe, () => version, () => version); return S; }

// ---- 인증 + 저장된 데이터 불러오기/저장하기 ----

// 이 사용자 id에 대해 이미 한 번 불러왔는지. 불러오기 전에 자동 저장이 먼저
// 실행되면 서버에 있던 값을 빈 값으로 덮어써 버릴 수 있어서, 이 값으로 막는다.
let loadedForUserId = null;
let saveTimer = null;

/** 로그인한 사용자의 목표 설정·브리핑 설정을 서버에서 불러와 S에 덮어쓴다. */
async function loadUserState(userId) {
  const { data, error } = await supabase
    .from('user_state')
    .select('plan, brief, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (!error && data) {
    if (data.plan && Object.keys(data.plan).length) S.a = { ...blank(), ...data.plan };
    if (data.brief && Object.keys(data.brief).length) S.brief = { ...S.brief, ...data.brief };
    S.lastSavedAt = data.updated_at ?? null;
  }
  loadedForUserId = userId;
  notify();   // 방금 불러온 값을 곧바로 다시 저장할 필요는 없으니 notify()만 한다.
}

/** 변경 사항을 잠시 모았다가(1.2초) 한 번에 저장한다. 로그인 전이거나 아직
 * 불러오기 전이면 아무것도 하지 않는다(빈 값으로 덮어쓰는 사고를 막는다). */
function scheduleSave() {
  if (!S.user || loadedForUserId !== S.user.id) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    const { error } = await supabase.from('user_state').upsert({
      user_id: S.user.id,
      plan: S.a,
      brief: S.brief,
      updated_at: new Date().toISOString(),
    });
    if (!error) { S.lastSavedAt = new Date().toISOString(); notify(); }
  }, 1200);
}

// 앱이 처음 뜰 때 이미 로그인된 세션이 있는지 확인하고, 있으면 저장된 데이터를 불러온다.
supabase.auth.getSession().then(({ data: { session } }) => {
  S.user = session?.user ?? null;
  notify();
  if (S.user) loadUserState(S.user.id);
});

// 로그인 / 로그아웃 / 토큰 갱신 등 상태가 바뀔 때마다 S.user를 갱신한다.
// 방금 로그인에 성공한 순간(SIGNED_IN)에는, 저장된 값을 불러온 뒤 그 결과에 따라
// (이미 목표를 세워둔 적 있으면 마이페이지로, 처음이면 대화로) 자동 이동한다.
supabase.auth.onAuthStateChange((event, session) => {
  const nextUser = session?.user ?? null;
  S.user = nextUser;
  notify();

  if (event === 'SIGNED_OUT') { loadedForUserId = null; return; }

  if (nextUser && loadedForUserId !== nextUser.id) {
    loadUserState(nextUser.id).then(() => {
      if (event === 'SIGNED_IN') go(planReady() ? 'mypage' : 'chat');
    });
  }
});

async function logout() {
  await supabase.auth.signOut();
  S.user = null;
  notify();
}

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
  logout,
};