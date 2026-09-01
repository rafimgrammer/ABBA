// AI 상세 계획 실행부 — 호출·취소·캐시. 결과는 S.ai에 담고 update()로 화면에 알린다.
import { S, update } from './store.js';
import { planKey, buildDetailedPlan } from './lib/coach.js';

// 같은 계획(목표·기간·저축액·성향이 모두 같음)이면 다시 부르지 않는다.
// 성향 세그먼트를 왔다 갔다 해도 첫 호출 이후엔 즉시 뜬다. 무료 한도(429)를 아끼는 목적도 있다.
const cache = new Map();
let ctl = null;

function setAi(patch) { S.ai = { ...S.ai, ...patch }; update(); }

/** 지금 계획에 대한 AI 상세본을 만든다. force면 캐시를 무시하고 다시 만든다. */
async function runCoach({ a, c, risk, force = false }) {
  const k = planKey(a, risk);

  if (!force) {
    const hit = cache.get(k);
    if (hit) { setAi({ status: 'ok', planKey: k, ...hit, error: null }); return; }
    if (S.ai.status === 'loading' && S.ai.planKey === k) return;   // 이미 같은 걸 만드는 중
  }

  ctl?.abort();
  ctl = new AbortController();
  const mine = ctl;
  setAi({ status: 'loading', planKey: k, data: null, meta: null, error: null });

  try {
    const r = await buildDetailedPlan({ a, c, risk, signal: mine.signal });
    if (mine.signal.aborted) return;
    const val = { data: r.data, meta: { model: r.model, ms: r.ms, retried: r.retried, corrected: r.corrected, fallback: r.fallback, facts: r.facts } };
    cache.set(k, val);
    setAi({ status: 'ok', planKey: k, ...val, error: null });
  } catch (e) {
    if (mine.signal.aborted || e?.name === 'AbortError') return;   // 화면이 떠났거나 입력이 바뀐 것
    setAi({
      status: 'error', planKey: k, data: null, meta: null,
      error: e?.message || '상세 계획을 만들지 못했어요.',
    });
  }
}

/** 설정에서 AI 상세 계획을 끄고 켠다. */
function toggleAi() {
  S.ai = { ...S.ai, on: !S.ai.on, status: 'idle', data: null, meta: null, error: null };
  ctl?.abort();
  update();
}

/** 키를 바꾸면 이전 키로 만든 결과는 의미가 없다. */
function resetCoach() { cache.clear(); ctl?.abort(); setAi({ status: 'idle', planKey: null, data: null, meta: null, error: null }); }

export { runCoach, toggleAi, resetCoach };
