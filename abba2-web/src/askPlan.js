// "계획에 대해 물어보기" 실행부 — 호출·취소·기록. 결과는 S.ask에 쌓고 update()로 알린다.
import { S, update } from './store.js';
import { askAboutPlan } from './lib/ask.js';

let ctl = null;

function setAsk(patch) { S.ask = { ...S.ask, ...patch }; update(); }

/** 질문 하나를 보낸다. 답이 오면 목록 맨 뒤에 쌓인다. */
async function ask({ a, c, risk, question }) {
  const q = String(question ?? '').trim();
  if (!q || S.ask.busy) return;

  ctl?.abort();
  ctl = new AbortController();
  const mine = ctl;
  setAsk({ busy: true, error: null });

  try {
    const r = await askAboutPlan({ a, c, risk, question: q, signal: mine.signal });
    if (mine.signal.aborted) return;
    S.ask.items.push({
      q, answer: r.answer, answerable: r.answerable, basis: r.basis ?? [],
      model: r.model, ms: r.ms, retried: r.retried, blocked: r.blocked,
    });
    setAsk({ busy: false, error: null });
  } catch (e) {
    if (mine.signal.aborted || e?.name === 'AbortError') return;
    setAsk({ busy: false, error: e?.message || '답을 만들지 못했어요.' });
  }
}

/** 계획이 바뀌면 이전 문답은 근거가 달라져 의미가 없다. */
function resetAsk() { ctl?.abort(); S.ask = { items: [], busy: false, error: null }; update(); }

export { ask, resetAsk };
