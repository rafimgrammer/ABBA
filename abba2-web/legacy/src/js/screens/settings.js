// 설정 — 브리핑 시간·알림 항목·연결·내 목표.
import { won } from '../utils.js';
import { ico } from '../icons.js';
import { S, GOAL_LABEL, startChat } from '../state.js';
import { topBar, tabbar } from '../ui.js';
import { planReady, render } from '../router.js';

function vSettings() {
  const st = S.brief, al = st.alerts;
  const sw = (key) => `<button class="sw ${al[key] ? 'on' : ''}" role="switch" aria-checked="${al[key]}" aria-label="${key}" onclick="toggleAlert('${key}')"></button>`;
  const times = ['07:00', '08:00', '09:00', '21:00'];
  return `${topBar('설정', { back: false })}
  <div class="main fade" style="padding-bottom:100px">
  <div class="card"><h3>${ico('bell', 18)}브리핑 알림</h3>
    <div class="srow first"><div><b>브리핑 시간</b><span>하루 한 번, 이 시간에 푸시로 보내요</span></div><span class="mid">${st.time}</span></div>
    <div class="mini">${times.map(t => `<button class="${st.time === t ? 'on' : ''}" onclick="setTime('${t}')">${t}</button>`).join('')}</div>
  </div>
  <div class="card"><h3>${ico('list', 18)}알림 항목</h3>
    <div class="srow first"><div><b>보유 종목 등락</b><span>하루 등락이 기준을 넘으면 알려요</span></div>${sw('price')}</div>
    <div class="mini" style="margin-top:0;margin-bottom:6px">${[2, 3, 5].map(t => `<button class="${st.th === t ? 'on' : ''}" onclick="setTh(${t})">±${t}%</button>`).join('')}</div>
    <div class="srow"><div><b>더 높은 금리 상품</b><span>내 적금·예금보다 0.5%p 이상 높은 상품이 나오면</span></div>${sw('rate')}</div>
    <div class="srow"><div><b>종목 뉴스 호재·악재 분석</b><span>보유 종목 기사를 AI가 분류해 요약</span></div>${sw('news')}</div>
    <div class="srow"><div><b>지표 전망</b><span>이동평균선 등 지표로 단기 흐름 안내</span></div>${sw('ma')}</div>
  </div>
  <div class="card"><h3>${ico('link', 18)}연결</h3>
    <div class="srow first"><div><b>은행 계좌 연동</b><span>마이데이터로 잔액·자동이체 확인</span></div><span class="pill">예정</span></div>
    <div class="srow"><div><b>증권 계좌 연동</b><span>보유 종목·평가금액 자동 반영</span></div><span class="pill">예정</span></div>
    <div class="srow"><div><b>AI가 학습하는 금융 정보</b><span>데이터 출처와 갱신 주기</span></div><a href="#/data" class="link" style="display:flex;align-items:center">보기 ${ico('right', 16)}</a></div>
  </div>
  <div class="card"><h3>${ico('target', 18)}내 목표</h3>
    ${planReady() ? `<div class="srow first"><div><b>${S.a.goalType === 'house' ? `집 사기 · 집값 ${won(S.a.amount)}` : `${GOAL_LABEL[S.a.goalType]} ${won(S.a.amount)}`}</b><span>${S.a.months ? `${S.a.months}개월` : '기간 미정'} · 월 ${won(S.a.saving)} · ${S.planRisk || S.a.risk}</span></div><a href="#/plan" class="link" style="display:flex;align-items:center">계획 ${ico('right', 16)}</a></div>` : `<div class="srow first"><div><b>아직 목표가 없어요</b><span>대화로 목표를 정하면 브리핑이 내 계획 기준으로 바뀌어요</span></div></div>`}
    <div class="srow"><div><b>목표 다시 정하기</b><span>처음부터 대화를 다시 시작해요</span></div><button class="btn sm ghost" onclick="startChat()">다시 시작</button></div>
  </div>
  </div>${tabbar('settings')}`;
}

function toggleAlert(k) { S.brief.alerts[k] = !S.brief.alerts[k]; render(); }

function setTime(t) { S.brief.time = t; render(); }

function setTh(t) { S.brief.th = t; render(); }

export { vSettings, toggleAlert, setTime, setTh };
