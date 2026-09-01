// 계획 화면의 AI 상세 계획 카드.
//
// 숫자는 전부 엔진이 만든 것이고, AI는 그걸 풀어 쓴 문장만 담당한다.
// "AI가 본 자료"를 접어서 그대로 보여준다 — 어떤 근거로 쓴 글인지 확인할 수 있게.
import { useEffect } from 'react';
import { Icon } from './Icon.jsx';
import { S, useStore } from '../store.js';
import { runCoach } from '../aiCoach.js';
import { autoRunAllowed } from '../lib/gemini.js';
import { planKey } from '../lib/coach.js';

function Section({ title, children }) {
  return <div className="aisec"><h4>{title}</h4>{children}</div>;
}

function Skeleton() {
  return (
    <div className="aiload" aria-live="polite">
      <div className="aisay"><div className="av">AI</div><div>계산 결과를 읽고 상세 계획을 쓰고 있어요. 5초쯤 걸려요.</div></div>
      <div className="skel" style={{ width: '92%' }} />
      <div className="skel" style={{ width: '78%' }} />
      <div className="skel" style={{ width: '85%' }} />
    </div>
  );
}

export function AiCoachCard({ a, c, risk }) {
  useStore();
  const ai = S.ai;
  const key = planKey(a, risk);
  const auto = autoRunAllowed();

  // 계획이 바뀌면 다시 만든다. 성향 세그먼트를 빠르게 눌러대도 마지막 것만 나가도록 늦춘다.
  useEffect(() => {
    if (!ai.on || !auto) return;
    const t = setTimeout(() => runCoach({ a, c, risk }), 700);
    return () => clearTimeout(t);
  }, [key, ai.on, auto]);   // eslint-disable-line react-hooks/exhaustive-deps

  if (!ai.on) return null;

  const stale = ai.planKey !== key;   // 계획이 방금 바뀌어 아직 새 결과가 안 온 상태
  const d = ai.data;

  return (
    <div className="card">
      <h3>
        <Icon name="sparkles" size={18} />AI 상세 계획
        <span className="tagx plan">Gemini</span>
      </h3>

      {(ai.status === 'loading' || (stale && auto && ai.status !== 'error')) && <Skeleton />}

      {!auto && ai.status === 'idle' && (
        <>
          <div className="sub">계산된 계획을 AI가 문장으로 풀어서 실행 순서·위험·중간 점검까지 정리해 줘요.</div>
          <button className="btn sm ghost" style={{ marginTop: 10 }} onClick={() => runCoach({ a, c, risk })}>AI 상세 계획 만들기</button>
        </>
      )}

      {ai.status === 'error' && !stale && (
        <>
          <div className="note"><Icon name="warn" size={16} /><div>{ai.error}</div></div>
          <button className="btn sm ghost" style={{ marginTop: 10 }} onClick={() => runCoach({ a, c, risk, force: true })}>다시 시도</button>
        </>
      )}

      {ai.status === 'ok' && !stale && d && (
        <>
          <div className="aisay"><div className="av">AI</div><div>{d.diagnosis}</div></div>

          <Section title="왜 이 배분인가요"><p className="sub">{d.why}</p></Section>

          {d.steps?.length > 0 && (
            <Section title="지금 할 일">
              {d.steps.map((s, i) => (
                <div className="aistep" key={i}>
                  <div className="n">{i + 1}</div>
                  <div><b>{s.title}</b><span className="when">{s.when}</span><span>{s.detail}</span></div>
                </div>
              ))}
            </Section>
          )}

          {d.risks?.length > 0 && (
            <Section title="확인할 위험">
              {d.risks.map((r, i) => (
                <div className="airisk" key={i}>
                  <Icon name="warn" size={15} />
                  <div><b>{r.title}</b><span>{r.detail}</span></div>
                </div>
              ))}
            </Section>
          )}

          {d.milestones?.length > 0 && (
            <Section title="중간 점검">
              {d.milestones.map((m, i) => (
                <div className="amile" key={i}>
                  <div className="hd"><b>{m.label}</b><span className="v">{m.target}</span></div>
                  <span>{m.detail}</span>
                </div>
              ))}
            </Section>
          )}

          {d.choice && (
            <Section title="어떤 조정안이 나을까요">
              <div className="alt rec"><div><b><span className="rectag">AI 추천</span>{d.choice.pick}</b><span>{d.choice.reason}</span></div></div>
            </Section>
          )}

          <details>
            <summary><Icon name="down" size={14} /> AI가 본 자료 (엔진 계산값)</summary>
            <div className="body"><pre className="facts">{ai.meta?.facts}</pre></div>
          </details>

          <div className="aifoot">
            {ai.meta?.fallback
              ? <span className="tagx need"><Icon name="warn" size={11} /> 검증 실패 · 계산값 기본 설명</span>
              : <span className="tagx plan"><Icon name="check" size={11} /> 숫자·표현 검증 통과</span>}
            <span className="muted">
              {ai.meta?.fallback
                ? `AI 문장이 두 번 다 걸려서 버렸어요 (${ai.meta.corrected.join(', ')})`
                : `${ai.meta?.model} · ${(ai.meta?.ms / 1000).toFixed(1)}초${ai.meta?.retried ? ` · 1회 교정(${ai.meta.corrected.join(', ')})` : ''}`}
            </span>
            <button className="link" onClick={() => runCoach({ a, c, risk, force: true })}>다시 만들기</button>
          </div>
        </>
      )}

      <div className="note" style={{ marginTop: 10 }}>
        <Icon name="info" size={16} />
        <div>금액·비율·기간은 모두 앱의 계산 엔진이 만든 값이고, AI는 설명 문장만 씁니다. 엔진에 없는 숫자나 수익 보장·매매 권유 표현이 섞이면 다시 쓰게 하고, 두 번째도 걸리면 계산값 기반 기본 설명으로 바꿔요. 투자 판단과 책임은 본인에게 있어요.</div>
      </div>
    </div>
  );
}
