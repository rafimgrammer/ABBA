// 라우팅 진입점. vanilla 판의 router.js render()를 대신한다.
import { useEffect } from 'react';
import { Strip, Sheet, Toast } from './components/Chrome.jsx';
import { Start } from './screens/Start.jsx';
import { Chat } from './screens/Chat.jsx';
import { Plan } from './screens/Plan.jsx';
import { Brief } from './screens/Brief.jsx';
import { Data } from './screens/Data.jsx';
import { Settings } from './screens/Settings.jsx';
import { useRoute, go } from './routing.js';
import { planReady, useStore } from './store.js';

const VIEWS = { start: Start, chat: Chat, plan: Plan, brief: Brief, data: Data, settings: Settings };

export function App() {
  const r = useRoute();
  useStore();
  const ready = planReady();

  // 계획이 없는데 #/plan으로 들어오면 대화로 보낸다.
  useEffect(() => { if (r === 'plan' && !ready) go('chat'); }, [r, ready]);

  // 화면이 바뀌면 맨 위로. (대화 화면은 자기 effect에서 맨 아래로 내린다.)
  useEffect(() => { window.scrollTo(0, 0); }, [r]);

  if (r === 'plan' && !ready) return null;
  const View = VIEWS[r] || Start;

  return (
    <>
      <div className="frame" id="app"><Strip /><View /></div>
      <div id="layer"><Sheet /></div>
      <Toast />
    </>
  );
}
