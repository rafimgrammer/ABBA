// 숫자·통화·날짜 포맷. (DOM 헬퍼·escape는 React가 대신하므로 없앴다.)
import { M } from './config.js';

const fmt = n => Number(n).toLocaleString('ko-KR');

function won(v, dec) {
  v = Math.round(v); const neg = v < 0; v = Math.abs(v); let s;
  if (v >= 1e8) {
    let eok = Math.floor(v / 1e8); let man = Math.round((v % 1e8) / M);
    if (man === 10000) { eok += 1; man = 0; }
    s = man ? `${fmt(eok)}억 ${fmt(man)}만 원` : `${fmt(eok)}억 원`;
  } else if (v >= M) {
    const man = v / M;
    s = (dec && Math.round(man * 10) % 10) ? `${fmt(Math.round(man * 10) / 10)}만 원` : `${fmt(Math.round(man))}만 원`;
  } else s = `${fmt(v)}원`;
  return (neg ? '-' : '') + s;
}

// 상수로 굳히면 탭을 자정 넘겨 열어둔 사이 날짜가 틀어진다. 호출 시점에 새로 읽는다.
function today() { return new Date(); }

function ymAdd(n) { const now = today(); const t = new Date(now.getFullYear(), now.getMonth() + n, 1); return `${t.getFullYear()}년 ${t.getMonth() + 1}월`; }

function todayLabel() { const t = today(); const d = ['일', '월', '화', '수', '목', '금', '토'][t.getDay()]; return `${t.getMonth() + 1}월 ${t.getDate()}일 ${d}요일`; }

export { fmt, won, today, ymAdd, todayLabel };
