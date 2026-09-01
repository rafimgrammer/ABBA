// 해시 라우터 — 화면 전환과 렌더링 진입점.
import { $ } from './utils.js';
import { S } from './state.js';
import { strip } from './ui.js';
import { vStart } from './screens/start.js';
import { vChat, afterChat } from './screens/chat.js';
import { vPlan } from './screens/plan.js';
import { vBrief } from './screens/brief.js';
import { vData } from './screens/data.js';
import { vSettings } from './screens/settings.js';

function route() { const h = location.hash.replace(/^#\/?/, ''); return h || 'start'; }

function go(r) { location.hash = r === 'start' ? '#/' : '#/' + r; }

function planReady() { return S.a.risk != null; }

function render() {
  let r = route();
  if (r === 'plan' && !planReady()) { go('chat'); return; }
  const app = $('#app');
  const view = { start: vStart, chat: vChat, plan: vPlan, brief: vBrief, data: vData, settings: vSettings }[r] || vStart;
  app.innerHTML = strip() + view();
  window.scrollTo(0, 0);
  if (r === 'chat') afterChat();
}

export { route, go, planReady, render };
