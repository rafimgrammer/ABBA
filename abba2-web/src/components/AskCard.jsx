// 계획 화면의 "물어보기" 카드.
//
// 자유 질문이지만 답의 근거는 엔진 수치로 묶여 있다(lib/ask.js). 화면에서도 그걸 보여준다.
//   - 답마다 "근거" 줄에 실제로 쓰인 확정 수치 항목을 붙인다
//   - 계획과 무관하거나 종목 추천·시장 예측이면 답하지 않고 그 이유를 띄운다
import { useEffect, useState } from 'react';
import { Icon } from './Icon.jsx';
import { S, useStore } from '../store.js';
import { ask, resetAsk } from '../askPlan.js';
import { suggestedQuestions } from '../lib/ask.js';
import { planKey } from '../lib/coach.js';

export function AskCard({ a, c, risk }) {
  useStore();
  const [q, setQ] = useState('');
  const key = planKey(a, risk);

  // 계획이 바뀌면 이전 문답은 근거가 달라져 의미가 없다.
  useEffect(() => { resetAsk(); setQ(''); }, [key]);   // eslint-disable-line react-hooks/exhaustive-deps

  const { items, busy, error } = S.ask;
  const send = text => { const t = (text ?? q).trim(); if (!t || busy) return; setQ(''); ask({ a, c, risk, question: t }); };

  return (
    <div className="card">
      <h3><Icon name="chatDots" size={18} />물어보기<span className="tagx plan">Gemini</span></h3>
      <div className="sub">이 계획에 대해 궁금한 걸 물어보세요. 답은 위 계산 결과만 근거로 만들어요.</div>

      {items.length > 0 && (
        <div className="qa">
          {items.map((it, i) => (
            <div className="qaitem" key={i}>
              <div className="qq"><span className="who">나</span>{it.q}</div>
              <div className={`qa-a${it.answerable ? '' : ' off'}`}>
                <span className="who">AI</span>
                <div>
                  <p>{it.answer}</p>
                  {it.answerable && it.basis.length > 0 && (
                    <ul className="basis">
                      {it.basis.map((b, k) => <li key={k}><Icon name="check" size={12} stroke={2.4} />{b}</li>)}
                    </ul>
                  )}
                  <div className="qmeta">
                    {it.answerable
                      ? <span className="tagx plan">근거 확인됨</span>
                      : <span className="tagx need">답변 범위 밖</span>}
                    {it.model && <span className="muted">{it.model} · {(it.ms / 1000).toFixed(1)}초{it.retried ? ' · 1회 교정' : ''}</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {busy && <div className="aisay" style={{ marginTop: 10 }}><div className="av">AI</div><div>계산 결과를 보고 답을 쓰는 중이에요.</div></div>}
      {error && <div className="note"><Icon name="warn" size={16} /><div>{error}</div></div>}

      {!busy && (
        <div className="chips" style={{ marginTop: 12 }}>
          {suggestedQuestions(c).slice(0, items.length ? 2 : 4).map(s => (
            <button className="chip" key={s} onClick={() => send(s)}>{s}</button>
          ))}
        </div>
      )}

      <div className="irow">
        <div className="field">
          <input
            value={q} onChange={e => setQ(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); send(); } }}
            placeholder="예: 기간을 3년으로 늘리면 어떻게 되나요?"
            aria-label="계획에 대한 질문" maxLength={200} disabled={busy}
            style={{ textAlign: 'left', fontSize: 14, fontWeight: 400 }}
          />
        </div>
        <button className="send" aria-label="질문 보내기" onClick={() => send()} disabled={busy || !q.trim()}>
          <Icon name="up" size={22} />
        </button>
      </div>

      <div className="note">
        <Icon name="info" size={16} />
        <div>종목 추천이나 시장 예측은 답하지 않아요. 금액·비율·기간은 계산 엔진이 만든 값만 쓰고, 어긋나면 답변을 버립니다.</div>
      </div>
    </div>
  );
}
