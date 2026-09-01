// 해시 라우터. react-router를 쓰지 않는다 — 화면이 6개뿐이고,
// #/plan 링크와 브라우저 뒤로가기를 vanilla 판과 똑같이 유지하기 위해서다.
import { useSyncExternalStore } from 'react';

function route() { const h = location.hash.replace(/^#\/?/, ''); return h || 'start'; }

function go(r) { location.hash = r === 'start' ? '#/' : '#/' + r; }

function subscribeHash(fn) {
  window.addEventListener('hashchange', fn);
  return () => window.removeEventListener('hashchange', fn);
}

function useRoute() { return useSyncExternalStore(subscribeHash, route, () => 'start'); }

export { route, go, useRoute };
