// AI가 학습하는 금융 정보 — 데이터 출처·갱신 주기·생성 순서.
import { Icon } from '../components/Icon.jsx';
import { TopBar, TabBar } from '../components/Chrome.jsx';
import { S, useStore } from '../store.js';

const SRC = [
  ['activity', '주식 시세·거래량', 'KRX 정보데이터시스템, 증권사 Open API(한국투자증권 KIS Developers 등). 종가·이동평균선·거래량을 매일 계산해요.', '장 마감 후 1회 + 장중 15분', '연동 예정', '실시간 시세 이용 약관 확인 필요'],
  ['bank', '예금·적금 금리', '금융감독원 금융상품통합비교공시 Open API(정기예금·적금 상품별 금리, 우대 조건).', '매일 1회', '연동 예정', ''],
  ['house', '대출 금리', '은행연합회 소비자포털 대출금리 비교 공시(주택담보·신용대출).', '월 1회 공시', '연동 예정', 'API 제공 형태 확인 필요'],
  ['news', '종목 뉴스', '언론사 RSS, 뉴스 검색 API. 보유 종목 키워드로 모아 AI가 호재·악재·중립으로 분류하고 근거 한 줄을 붙여요.', '30분', '연동 예정', ''],
  ['percent', '기준금리·거시지표', '한국은행 ECOS Open API(기준금리, 물가, 환율).', '발표 시', '연동 예정', ''],
  ['wallet', '내 계좌·투자 현황', '마이데이터(오픈뱅킹)·증권사 API 연동. 시안에서는 대화로 입력한 값을 써요.', '매일 브리핑 직전', '시안: 수동 입력', '마이데이터 사업자 자격 요건 확인 필요. 토스증권은 공개 API가 없어 증권사 Open API로 대체 검토'],
  ['sparkles', '설명 문장 생성 AI', 'Google Gemini(gemini-3.5-flash). 엔진이 계산한 값만 건네고 설명·실행 순서·위험만 쓰게 해요. 숫자는 코드가 만들고 AI는 문장만 씁니다.', '계획이 바뀔 때마다', '연결됨', '시안은 브라우저에서 직접 호출해요. 배포본은 서버를 거쳐야 키가 노출되지 않아요'],
];

export function Data() {
  useStore();
  return (
    <>
      <TopBar title="AI가 학습하는 금융 정보" backTo="settings" />
      <div className="main fade" style={{ paddingBottom: 100 }}>
        <div className="card">
          <h3><Icon name="db" size={18} />어떻게 학습하나요</h3>
          <div className="sub">매일 아래 데이터를 모아 정리한 뒤 AI에게 함께 건네요(검색 증강 방식). 금액·비율·이동평균 같은 숫자는 코드가 계산하고, AI는 상황 판단과 설명 문장만 맡아요. 그래서 같은 데이터면 같은 숫자가 나와요.</div>
          <div className="note"><Icon name="check" size={16} /><div>AI 응답에 계산값에 없는 숫자가 섞이면, 그 숫자를 짚어 다시 생성하고 두 번째도 어긋나면 답변을 버려요. 계획 화면의 <b>AI 상세 계획</b>에 적용돼 있어요 — 카드 안 "AI가 본 자료"에서 넘긴 근거를 그대로 볼 수 있어요.</div></div>
        </div>
        <div className="card">
          {SRC.map(([i, t, d, cyc, stt, need], k) => (
            <div className={`src ${k ? '' : 'first'}`} key={t}>
              <b><Icon name={i} size={16} />{t} <span className={`tagx ${stt === '연결됨' ? 'live' : stt.startsWith('연동') ? 'plan' : ''}`}>{stt}</span></b>
              <p>{d}</p>
              <div className="meta">
                <span>갱신 {cyc}</span>
                {need && <span className="tagx need" style={{ margin: 0 }}>확인 필요: {need}</span>}
              </div>
            </div>
          ))}
        </div>
        <div className="card">
          <h3><Icon name="clock" size={18} />브리핑이 만들어지는 순서</h3>
          <div className="sub">매일 {S.brief.time} 기준. 1) 시세·금리·뉴스 수집 2) 코드가 등락률·이동평균·금리 차이·필요 납입액 계산 3) 알림 기준에 걸린 항목만 추림 4) AI가 항목별 한 줄 설명과 오늘 할 일 작성 5) 푸시 알림 발송, 앱에서 전체 브리핑 열람.</div>
        </div>
      </div>
      <TabBar cur="data" />
    </>
  );
}
