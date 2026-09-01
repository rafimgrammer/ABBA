// 해시 라우터. react-router를 쓰지 않는다 — 화면이 6개뿐이고,
// #/plan 링크와 브라우저 뒤로가기를 vanilla 판과 똑같이 유지하기 위해서다.
import { useSyncExternalStore } from 'react';

function route() {
  const h = location.hash;
  // 랜딩 안의 #how 같은 섹션 앵커는 라우팅 대상이 아니다. 화면을 바꾸지 않고 스크롤만 되게 둔다.
  if (!h.startsWith('#/')) return 'start';
  return h.slice(2) || 'start';
}

function go(r) { location.hash = r === 'start' ? '#/' : '#/' + r; }

function subscribeHash(fn) {
  window.addEventListener('hashchange', fn);
  return () => window.removeEventListener('hashchange', fn);
}

function useRoute() { return useSyncExternalStore(subscribeHash, route, () => 'start'); }

export { route, go, useRoute };
