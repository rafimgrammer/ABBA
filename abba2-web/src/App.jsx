// 라우팅 진입점. vanilla 판의 router.js render()를 대신한다.
//
// 화면은 두 종류다.
//   랜딩(#/)  — PC 웹 기준 풀와이드. 프레임 밖에 그린다.
//   앱(#/chat 등) — 430px 모바일 프레임 안.
import { useEffect } from 'react';
import { Strip, Sheet, Toast } from './components/Chrome.jsx';
import { Home } from './screens/Home.jsx';
import { Chat } from './screens/Chat.jsx';
import { Plan } from './screens/Plan.jsx';
import { Brief } from './screens/Brief.jsx';
import { Data } from './screens/Data.jsx';
import { Settings } from './screens/Settings.jsx';
import { MyPage } from './screens/MyPage.jsx';
import { useRoute, go } from './routing.js';
import { S, planReady, useStore } from './store.js';

const VIEWS = { chat: Chat, plan: Plan, brief: Brief, data: Data, settings: Settings, mypage: MyPage };

export function App() {
  const r = useRoute();
  useStore();
  const ready = planReady();
  const View = VIEWS[r];

  // 계획이 없는데 #/plan으로 들어오면 대화로 보낸다.
  useEffect(() => { if (r === 'plan' && !ready) go('chat'); }, [r, ready]);

  // 로그인하지 않은 채로 #/mypage에 들어오면 홈으로 보낸다. 마이페이지는
  // 로그인한 사용자에 대한 정보를 보여주는 화면이라 로그인 없이는 의미가 없다.
  useEffect(() => { if (r === 'mypage' && !S.user) go('start'); }, [r, S.user]);

  // 없는 화면(#/xyz)으로 들어오면 랜딩으로 되돌린다. 주소창에 죽은 경로가 남지 않게.
  useEffect(() => { if (r !== 'start' && !VIEWS[r]) go('start'); }, [r]);

  // 화면이 바뀌면 맨 위로. (대화 화면은 자기 effect에서 맨 아래로 내린다.)
  useEffect(() => { window.scrollTo(0, 0); }, [r]);

  const body = r === 'plan' && !ready
    ? null
    : View
      ? <div className="frame" id="app"><Strip /><View /></div>
      : <><Strip /><Home /></>;

  return (
    <>
      {body}
      <div id="layer"><Sheet /></div>
      <Toast />
    </>
  );
}