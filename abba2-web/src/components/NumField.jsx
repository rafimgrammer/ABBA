// 대화 화면의 숫자 입력칸. vanilla 판의 live()/submitInput()/onNumKey를 한 컴포넌트로 모았다.
//
// 값은 이 컴포넌트가 들고 있고(제어 컴포넌트), 콤마를 다시 붙이며 캐럿을 복원한다.
// 검증·파싱 규칙은 lib/validate.js에 그대로 남아 있다.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Icon } from './Icon.jsx';
import { keyHint, dataHint, parseNum, validate } from '../lib/validate.js';

export function NumField({ q, onSubmit, undoBtn, focusSignal = 0 }) {
  const [v, setV] = useState({ text: '', n: null, rejected: null });
  const el = useRef(null);
  const caret = useRef(null);   // 다음 렌더 뒤 복원할 캐럿 위치
  const pending = useRef(null); // 키·beforeinput에서 잡은 거절 사유

  // 콤마를 다시 붙이면 캐럿이 끝으로 튄다. 렌더 직후 앞쪽 숫자 개수 기준으로 되돌린다.
  useLayoutEffect(() => {
    if (caret.current == null || !el.current) return;
    try { el.current.setSelectionRange(caret.current, caret.current); } catch { /* 지원 안 하는 타입 */ }
    caret.current = null;
  });

  // "직접 입력" 칩을 누르면 부모가 신호를 올린다.
  useEffect(() => { if (focusSignal) el.current?.focus(); }, [focusSignal]);

  function apply(raw, pos, hint) {
    const r = parseNum(raw, pos, hint);
    caret.current = r.caret;
    setV({ text: r.text, n: r.n, rejected: r.rejected });
    return r;
  }

  const r = validate(q, v.n, v.rejected);

  function submit() { if (validate(q, v.n, v.rejected).ok) onSubmit(v.n); }

  function onKeyDown(e) {
    if (e.key === 'Enter') { e.preventDefault(); submit(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const h = keyHint(e.key);
    if (!h) return;
    e.preventDefault();   // 1층: 숫자가 아닌 글자키는 아예 들어오지 않는다
    const node = e.currentTarget;
    apply(node.value, node.selectionStart ?? node.value.length, h);
  }

  // 붙여넣기·드롭은 막지 않고 들여보낸 뒤 parseNum이 정리한다(모바일 IME 호환).
  function onBeforeInput(e) { pending.current = dataHint(e.data) ?? pending.current; }

  function onChange(e) {
    const node = e.target;
    const h = pending.current; pending.current = null;
    apply(node.value, node.selectionStart ?? node.value.length, h);
  }

  const monthly = q.unit === '개월';
  const err = r.ok ? !!r.warn : (v.n != null || !!v.rejected);

  return (
    <>
      <div className="irow">
        <div className="field">
          <input
            id="num" ref={el} value={v.text}
            inputMode="numeric" autoComplete="off"
            placeholder={monthly ? '개월 수' : '금액'}
            aria-label={monthly ? '개월 수' : '금액(만 원)'}
            onChange={onChange} onKeyDown={onKeyDown} onBeforeInput={onBeforeInput}
            onFocus={() => setTimeout(() => el.current?.scrollIntoView({ block: 'nearest' }), 60)}
          />
          <span>{q.unit}</span>
        </div>
        <button className="send" id="send" aria-label="보내기" onClick={submit} disabled={!r.ok}><Icon name="up" size={22} /></button>
      </div>
      <div className={`help${err ? ' err' : ''}`} id="help">
        <span id="helpL">{r.ok && r.warn ? `${r.warn} · ${r.msg}` : r.msg}</span>
        <span>{undoBtn}</span>
      </div>
    </>
  );
}
