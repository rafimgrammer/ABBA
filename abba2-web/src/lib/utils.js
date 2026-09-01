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

const TODAY = new Date();

function ymAdd(n) { const t = new Date(TODAY.getFullYear(), TODAY.getMonth() + n, 1); return `${t.getFullYear()}년 ${t.getMonth() + 1}월`; }

function ymShort(n) { const t = new Date(TODAY.getFullYear(), TODAY.getMonth() + n, 1); return `${t.getFullYear()}.${String(t.getMonth() + 1).padStart(2, '0')}`; }

function todayLabel() { const d = ['일', '월', '화', '수', '목', '금', '토'][TODAY.getDay()]; return `${TODAY.getMonth() + 1}월 ${TODAY.getDate()}일 ${d}요일`; }

export { fmt, won, TODAY, ymAdd, ymShort, todayLabel };
