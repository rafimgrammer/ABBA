// 화면 공통 조각 — 상단 띠·헤더·탭바·화면 목록 시트·토스트.
import { DOCS } from './config.js';
import { $, esc } from './utils.js';
import { ico } from './icons.js';
import { S, startChat, fillExample } from './state.js';
import { go, planReady } from './router.js';

function strip() { return `<div class="strip"><div><b>ABBA 2.0</b> 시안 v1.3 · 팀 공유판 · 예시 데이터</div><button onclick="openSheet()">화면 목록</button></div>`; }

function topBar(title, opt = {}) {
  const back = opt.back === false ? '<span style="width:8px"></span>' : `<button class="ib" aria-label="뒤로" onclick="${opt.backTo ? `go('${opt.backTo}')` : 'history.back()'}">${ico('back')}</button>`;
  return `<div class="top">${back}<h2>${title}</h2>${opt.right || ''}</div>${opt.bar != null ? `<div class="bar"><i style="width:${opt.bar}%"></i></div>` : ''}`;
}

function tabbar(cur) {
  const t = [['plan', 'home', '계획'], ['brief', 'bell', '브리핑'], ['settings', 'sliders', '설정']];
  const on = cur === 'data' ? 'settings' : cur;
  return `<nav class="tabbar">${t.map(([r, i, l]) => `<a href="#/${r}" class="${on === r ? 'on' : ''}">${ico(i, 22)}${l}</a>`).join('')}</nav>`;
}

function openSheet() {
  $('#layer').innerHTML = `<div class="ov" onclick="if(event.target===this)closeSheet()"><div class="sheet"><h4>화면 목록 <button class="ib" style="border:0;background:transparent" aria-label="닫기" onclick="closeSheet()">${ico('x', 20)}</button></h4>
    <a href="#/" onclick="closeSheet()">시작<span>서비스 소개</span></a>
    <a href="#/chat" onclick="closeSheet();if(!S.chat.log.length)startChat()">1 목적 설정 대화<span>AI가 묻고 답하는 흐름</span></a>
    <a href="#/plan" onclick="closeSheet();if(!planReady())fillExample()">2 추천 계획<span>${planReady() ? '내 답변 기준' : '예시 값으로 열기'}</span></a>
    <a href="#/brief" onclick="closeSheet()">4 오늘의 브리핑<span>하루 한 번 알림 예시</span></a>
    <a href="#/data" onclick="closeSheet()">3 AI가 학습하는 금융 정보<span>데이터 출처·갱신 주기</span></a>
    <a href="#/settings" onclick="closeSheet()">알림 설정<span>시간·항목·연결</span></a>
    <h4 style="margin-top:14px">팀 문서 <span class="muted" style="font-weight:400;font-size:12px">새 창으로 열림</span></h4>
    ${DOCS.map(d => `<a class="doc" href="${d.url}" target="_blank" rel="noopener">${esc(d.title)}<span>${esc(d.desc)}</span></a>`).join('')}
    <div class="muted" style="padding:10px 4px 0">파일 원본: 프로젝트 폴더 <b>09_ABBA 2.0</b></div>
  </div></div>`;
}

function closeSheet() { $('#layer').innerHTML = ''; }

let toastT = null;

function toast(msg) { let t = $('#toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); } t.textContent = msg; clearTimeout(toastT); toastT = setTimeout(() => t.remove(), 1600); }

export { strip, topBar, tabbar, openSheet, closeSheet, toast };
