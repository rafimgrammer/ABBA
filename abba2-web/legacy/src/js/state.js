// 전역 상태와 목적 설정 진행도. 화면은 이 상태만 보고 그린다(서버 없음).
import { M } from './config.js';
import { won } from './utils.js';
import { qFor } from './questions.js';
import { go } from './router.js';

const blank = () => ({ goalType: null, amount: null, months: null, monthsKnown: null, lump: null, income: null, expense: null, saving: null, risk: null, suggested: false });

const S = {
  a: blank(),
  chat: { log: [], done: false, mode: 'expense', busy: false, pendingCustom: false },
  planRisk: null,
  brief: { time: '08:00', th: 3, alerts: { price: true, rate: true, news: true, ma: true } },
  demo: false,
};

const ORDER = ['goalType', 'amount', 'months', 'lump', 'income', 'expense', 'saving', 'risk'];

const GOAL_LABEL = { house: '집 사기', lump: '목돈 모으기', item: '사고 싶은 물건', none: '그냥 재테크' };

function included(id) { const a = S.a; if (id === 'amount') return a.goalType && a.goalType !== 'none'; if (id === 'saving') return a.expense != null; return true; }

function answered(id) { const a = S.a; if (id === 'months') return a.monthsKnown !== null; if (id === 'expense') return a.expense != null || a.saving != null; return a[id] != null; }

function currentQ() { for (const id of ORDER) if (included(id) && !answered(id)) return id; return null; }

function progress() { const ids = ORDER.filter(included); return { done: ids.filter(answered).length, total: ids.length }; }

function startChat() { S.a = blank(); S.chat = { log: [], done: false, mode: 'expense', busy: false, pendingCustom: false }; S.planRisk = null; S.demo = false; go('chat'); }

function fillExample() {
  S.a = Object.assign(blank(), { goalType: 'lump', amount: 3000 * M, months: 24, monthsKnown: true, lump: 0, income: 250 * M, expense: 160 * M, saving: 90 * M, risk: '중립형' });
  S.planRisk = '중립형'; S.demo = true;
  S.chat = { log: [], done: true, mode: 'expense', busy: false, pendingCustom: false };
  const pairs = [['goalType', '목돈 모으기'], ['amount', '3,000만 원'], ['months', '24개월'], ['lump', '없어요'], ['income', '250만 원'], ['expense', '160만 원'], ['saving', '90만 원'], ['risk', '중립형']];
  const tmp = Object.assign({}, S.a);
  pairs.forEach(([id, label]) => { S.chat.log.push({ who: 'ai', kind: 'q', qid: id, text: qFor(id).text }); S.chat.log.push({ who: 'me', kind: 'a', qid: id, text: label }); });
  S.chat.log.push({ who: 'ai', kind: 'done', text: '필요한 정보는 다 모였어요. 추천 계획을 만들었어요.' });
  go('plan');
}

export { blank, S, ORDER, GOAL_LABEL, included, answered, currentQ, progress, startChat, fillExample };
