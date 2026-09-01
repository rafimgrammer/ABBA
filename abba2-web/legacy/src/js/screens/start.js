// 시작 화면 — 서비스 소개와 진입 CTA.
import { ico } from '../icons.js';

function vStart() {
  return `<div class="main fade">
  <div class="hero">
    <div class="brand">ABBA 2.0</div>
    <h1>묻기 전에 먼저 알려주는<br>AI 재테크 코치</h1>
    <p>목표를 같이 정하고, 적금·예금·채권·주식을 어떻게 나눌지 계산해요. 그다음부터는 매일 아침 AI가 먼저 점검 결과를 보내드려요.</p>
  </div>
  <div class="steps">
    <div class="step"><div class="n">1</div><div><b>목적 설정</b><span>기간·목표·수입·지출을 대화로 물어봐요. 기간이나 목표를 아직 몰라도 괜찮아요.</span></div></div>
    <div class="step"><div class="n">2</div><div><b>방법 추천</b><span>성향과 기간에 맞춰 적금·예금·채권·주식 비율과 예상 수익을 계산해요. 집이 목표면 대출까지 봐요.</span></div></div>
    <div class="step"><div class="n">3</div><div><b>매일 브리핑</b><span>보유 종목 등락, 더 높은 금리 상품, 종목 뉴스 호재·악재, 이동평균선 전망을 하루 한 번 알려드려요.</span></div></div>
  </div>
  <div class="note">${ico('info', 16)}<div>시안입니다. 계산은 화면 안의 규칙으로 실제로 돌고, AI 문장은 템플릿, 브리핑의 시세·뉴스·상품은 예시 데이터예요. 로그인·저장·실데이터·Claude 문장은 9/6까지 본 구현에서 붙습니다. 팀 문서는 상단 "화면 목록"에 있어요.</div></div>
  </div>
  <div class="cta"><button class="btn" onclick="startChat()">목표 정하기 시작</button><button class="sub2" onclick="fillExample()">예시 값으로 계획 화면 바로 보기</button></div>`;
}

export { vStart };
