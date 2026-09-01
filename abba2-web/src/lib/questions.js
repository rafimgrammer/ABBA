// 목적 설정 대화의 질문·선택지·확인 문구. 문구를 고치려면 여기만 본다.
import { M, LTV } from './config.js';
import { fmt, won, ymAdd } from './utils.js';
import { S } from '../store.js';
import { ENGINE } from './engine.js';

function qFor(id) {
  const a = S.a;
  switch (id) {
    case 'goalType': return { id, text: '안녕하세요, ABBA 2.0이에요.\n먼저 무엇을 위해 돈을 모으는지 알려주세요.', type: 'chips', chips: [{ l: '집 사기', v: 'house' }, { l: '목돈 모으기', v: 'lump' }, { l: '사고 싶은 물건', v: 'item' }, { l: '아직 없어요, 그냥 재테크', v: 'none' }] };
    case 'amount':
      if (a.goalType === 'house') return { id, text: `목표 집값은 얼마인가요?\n집값의 ${Math.round(LTV * 100)}%는 대출로 보고(LTV 가정), 나머지 ${Math.round((1 - LTV) * 100)}%를 저축 목표로 잡을게요.`, type: 'num', unit: '만 원', min: 1000, chips: [{ l: '2억', v: 20000 }, { l: '3억', v: 30000 }, { l: '5억', v: 50000 }, { l: '직접 입력', v: 'custom' }] };
      if (a.goalType === 'item') return { id, text: '사고 싶은 물건은 얼마인가요?', type: 'num', unit: '만 원', min: 10, chips: [{ l: '300만', v: 300 }, { l: '500만', v: 500 }, { l: '1,000만', v: 1000 }, { l: '직접 입력', v: 'custom' }] };
      return { id, text: '얼마를 모으고 싶으세요?', type: 'num', unit: '만 원', min: 10, chips: [{ l: '1,000만', v: 1000 }, { l: '3,000만', v: 3000 }, { l: '5,000만', v: 5000 }, { l: '1억', v: 10000 }, { l: '직접 입력', v: 'custom' }] };
    case 'months': return { id, text: a.goalType === 'none' ? '얼마 동안 모을 생각이세요?' : '언제까지 모으고 싶으세요?', type: 'num', unit: '개월', min: 1, max: 600, chips: [{ l: '1년', v: 12 }, { l: '2년', v: 24 }, { l: '3년', v: 36 }, { l: '5년', v: 60 }, { l: '직접 입력', v: 'custom' }, { l: '아직 모르겠어요', v: 'unknown' }] };
    case 'lump': return { id, text: '지금까지 모아둔 돈이 있나요?\n이 목표에 쓸 수 있는 금액만 알려주세요.', type: 'num', unit: '만 원', min: 0, chips: [{ l: '없어요', v: 0 }, { l: '500만', v: 500 }, { l: '1,000만', v: 1000 }, { l: '직접 입력', v: 'custom' }] };
    case 'income': return { id, text: '한 달 수입은 얼마인가요?\n세후 실수령 기준이에요.', type: 'num', unit: '만 원', min: 10, chips: [{ l: '200만', v: 200 }, { l: '250만', v: 250 }, { l: '300만', v: 300 }, { l: '직접 입력', v: 'custom' }] };
    case 'expense': return { id, text: '한 달 지출은 보통 얼마인가요?\n지출 대신 매달 저축할 금액을 바로 알려주셔도 돼요.', type: 'expense', unit: '만 원', min: 0 };
    case 'saving': { const max = Math.max(0, a.income - a.expense); const c = x => Math.floor(max * x / M); return { id, text: `그럼 매달 최대 ${won(max)}을 저축할 수 있어요.\n이 중 얼마를 저축할까요?`, type: 'num', unit: '만 원', min: 1, chips: [{ l: `전부 ${won(max)}`, v: max / M }, { l: `${fmt(c(0.8))}만`, v: c(0.8) }, { l: `${fmt(c(0.6))}만`, v: c(0.6) }, { l: '직접 입력', v: 'custom' }] }; }
    case 'risk': return { id, text: '마지막으로 투자 성향을 골라주세요.\n주식·채권 비율을 정하는 데 써요.', type: 'chips', chips: [{ l: '안정형', d: '원금 지키기가 우선', v: '안정형' }, { l: '중립형', d: '적당한 변동은 감수', v: '중립형' }, { l: '공격형', d: '수익 우선, 변동 감수', v: '공격형' }, { l: '잘 모르겠어요', d: '중립형으로 시작', v: 'unsure' }] };
  }
}

function expenseChips(mode) { return mode === 'expense' ? [{ l: '100만', v: 100 }, { l: '150만', v: 150 }, { l: '200만', v: 200 }, { l: '직접 입력', v: 'custom' }] : [{ l: '50만', v: 50 }, { l: '80만', v: 80 }, { l: '100만', v: 100 }, { l: '직접 입력', v: 'custom' }]; }

function ackFor(id, v) {
  const a = S.a;
  switch (id) {
    case 'goalType': return { house: '집은 대출까지 같이 봐야 해요. 목표 집값 기준으로 자기자본부터 계산할게요.', lump: '좋아요. 금액과 기간만 정하면 바로 계획이 나와요.', item: '금액 기준으로 언제 살 수 있는지 계산해 드릴게요.', none: '괜찮아요. 저축 가능한 금액을 보고 맞는 목표를 제안해 드릴게요.' }[v];
    case 'amount': return a.goalType === 'house' ? `${won(v)}이면 자기자본 ${Math.round((1 - LTV) * 100)}%인 ${won(v * (1 - LTV))}이 저축 목표예요. 나머지는 대출로 계산할게요.` : `${won(v)}을 목표로 잡을게요.`;
    case 'months': return v == null ? '기간은 비워둘게요. 매달 저축액으로 언제 도달하는지 계산해 드릴게요.' : `${fmt(v)}개월이면 ${ymAdd(v - 1)}까지예요.`;
    case 'lump': return v > 0 ? `모아둔 ${won(v)}은 예금·채권 쪽에 먼저 넣어 굴릴게요.` : '괜찮아요. 매달 저축액이 핵심이에요.';
    case 'income': return `월 ${won(v)} 기준으로 볼게요.`;
    case 'expense': return `수입에서 지출을 빼면 매달 ${won(a.income - v)}이 남아요.`;
    case 'savingDirect': return `매달 ${won(v)} 저축으로 계획할게요. 수입의 ${Math.round(v / a.income * 100)}%예요.`;
    case 'saving': return `매달 ${won(v)}으로 계획할게요.`;
    case 'risk': {
      const w = ENGINE.weights(a.risk, a.months);
      const head = v === 'unsure' ? '그럼 중립형으로 시작할게요. 계획 화면에서 언제든 바꿀 수 있어요.\n' : '';
      const rule = ENGINE.ruleNote(a.risk, a.months);
      return head + `${a.risk}이면 주식 ${w[3]}%, 채권 ${w[2]}%, 나머지 ${w[0] + w[1]}%는 적금·예금으로 나눌게요.` + (rule ? '\n' + rule : '');
    }
  }
}

export { qFor, expenseChips, ackFor };
