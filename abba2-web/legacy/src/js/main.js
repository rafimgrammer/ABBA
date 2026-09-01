// 부팅 — 화면은 문자열 템플릿으로 그리고 인라인 onclick으로 함수를 부른다.
// 모듈 스코프는 전역이 아니므로, 템플릿에서 부르는 함수만 여기서 window에 노출한다.
// (본 구현에서 React로 옮길 때 이 파일이 사라지고 각 화면이 컴포넌트가 된다.)
import { render, go } from './router.js';
import { startChat, fillExample } from './state.js';
import { openSheet, closeSheet } from './ui.js';
import { onNumKey, onNumBeforeInput } from './validate.js';
import { live, submitInput, chip, undo, setMode, onFocusNum } from './screens/chat.js';
import { pickSuggest, setRisk, applyMonths, applySaving, applyRisk } from './screens/plan.js';
import { toggleAlert, setTime, setTh } from './screens/settings.js';

Object.assign(window, {
  go, startChat, fillExample, openSheet, closeSheet,
  onNumKey, onNumBeforeInput, onFocusNum, live, submitInput, chip, undo, setMode,
  pickSuggest, setRisk, applyMonths, applySaving, applyRisk,
  toggleAlert, setTime, setTh,
});

window.addEventListener('hashchange', render);
render();
