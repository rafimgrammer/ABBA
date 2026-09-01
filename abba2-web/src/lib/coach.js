// AI 상세 계획 — "숫자는 코드가 만들고, AI는 문장만 쓴다"는 프로젝트 규칙의 구현부.
//
// 흐름
//   1) factSheet()  엔진이 계산한 값을 라벨 붙은 텍스트로 만든다. AI가 볼 수 있는 숫자는 이게 전부다.
//   2) callGemini() 구조화 출력(JSON 스키마)으로 진단·근거·실행 순서·위험·중간 점검을 받는다.
//   3) verify()     응답에서 금액·비율·기간 토큰을 뽑아 factSheet에 있던 것인지 대조한다.
//                   어긋나면 어긋난 토큰을 알려주고 한 번 더 시킨다. 두 번째도 실패하면 버린다.
//
// 3번이 README가 약속한 "숫자 검증 루프"다. 검증을 통과하지 못한 문장은 화면에 띄우지 않는다.
import { M, RATES, TAX, LTV, GOAL_LABEL } from './config.js';
import { won, ymAdd } from './utils.js';
import { ENGINE } from './engine.js';
import { callGemini } from './gemini.js';

// ---------- 1. 확정 수치 ----------

const GOAL_DESC = {
  house: `집 사기 (집값의 ${Math.round((1 - LTV) * 100)}%를 자기자본으로 모으는 중)`,
  lump: '목돈 모으기',
  item: '사고 싶은 물건 사기',
  none: '뚜렷한 목표 없이 재테크 (앱이 목표 금액을 제안함)',
};

/** 기간의 1/4·1/2·3/4 시점 예상 잔액. AI가 중간 목표를 지어내지 않도록 미리 계산해 준다. */
function milestones(a, c) {
  const ns = [...new Set([Math.round(c.months / 4), Math.round(c.months / 2), Math.round(c.months * 3 / 4)])]
    .filter(n => n > 0 && n < c.months);
  return ns.map(n => ({ n, net: ENGINE.project(a.saving, a.lump, n, c.w).net }));
}

/** 조정안 후보. 계획 화면의 카드와 같은 계산을 쓴다(화면과 AI가 다른 말을 하면 안 된다). */
function options(a, c, risk) {
  const out = [];
  if (c.status !== 'ok' && !c.computed) {
    const n2 = ENGINE.monthsToGoal(c.target, a.saving, a.lump, risk);
    if (n2) out.push(`기간을 ${n2}개월로 늘리기 → ${ymAdd(n2 - 1)} 도달, 월 저축액 그대로. 앱이 추천하는 안이다.`);
    else out.push('기간 늘리기 → 50년 안에는 도달하기 어렵다.');
    const reqR = Math.ceil(ENGINE.requiredSaving(c.target, c.months, a.lump, risk) / M) * M;
    const maxSave = a.expense != null ? a.income - a.expense : a.income;
    out.push(`월 저축을 ${won(reqR)}으로 올리기 → 지금보다 ${won(reqR - a.saving)} 더 낸다.`
      + (reqR > maxSave ? ` 다만 지출을 빼면 ${won(maxSave)}까지만 가능해서 이 안은 실행할 수 없다.` : ''));
    const next = risk === '안정형' ? '중립형' : risk === '중립형' ? '공격형' : null;
    if (next && c.months > 12) {
      const pn = ENGINE.project(a.saving, a.lump, c.months, ENGINE.weights(next, c.months));
      out.push(`${next}으로 성향 바꾸기 → 예상 총액 ${won(pn.net)}.`
        + (pn.net >= c.target ? ' 이것만으로 목표에 닿는다.' : ' 성향만 바꿔서는 부족분을 메우지 못한다.'));
    }
  }
  return out;
}

/** 엔진 계산값 전부를 AI에게 넘길 텍스트로 만든다. 여기 없는 숫자는 AI가 쓰면 안 된다. */
function factSheet(a, c, risk) {
  const L = [];
  const savingRate = a.income ? Math.round(a.saving / a.income * 100) : null;

  L.push('[목표]');
  L.push(`종류: ${GOAL_DESC[a.goalType] ?? GOAL_LABEL[a.goalType]}`);
  if (a.goalType === 'house') L.push(`목표 집값: ${won(a.amount)} / 그중 저축으로 모을 자기자본: ${won(c.target)}`);
  else L.push(`목표 금액: ${won(c.target)}`);
  L.push(c.unreachable
    ? '기간: 정하지 않음. 지금 저축액으로는 50년 안에 도달하기 어렵다.'
    : `기간: ${c.months}개월${c.computed ? ' (사용자가 정하지 않아 앱이 계산한 기간)' : ''} · ${ymAdd(c.months - 1)}까지`);

  L.push('', '[내 상황]');
  L.push(`월 수입(세후): ${won(a.income)}`);
  if (a.expense != null) L.push(`월 지출: ${won(a.expense)}`);
  L.push(`월 저축: ${won(a.saving)}${savingRate != null ? ` (수입의 ${savingRate}%)` : ''}`);
  L.push(`이미 모아둔 돈: ${won(a.lump || 0)}`);
  L.push(`투자 성향: ${risk}`);

  L.push('', '[계산 결과 — 세후]');
  L.push(`${c.months}개월 뒤 예상 총액: ${won(c.p.net)}`);
  L.push(`그중 원금: ${won(c.p.principal)} · 이자·수익: ${won(c.p.gain)}`);
  L.push(`판정: ${{ ok: '목표 달성 가능', near: '조금 부족', redesign: '재설계 필요', unreach: '도달 어려움' }[c.status]}`);
  L.push(c.short > 0 ? `부족한 금액: ${won(c.short)}` : `목표보다 여유: ${won(-c.short)}`);

  L.push('', `[추천 배분 — ${risk} · 가정 수익률 연 ${(ENGINE.blend(c.w) * 100).toFixed(1)}%]`);
  c.p.rows.forEach(r => {
    if (!r.w && !r.lump) { L.push(`${r.key}: 0% (이 계획에서는 쓰지 않는다)`); return; }
    L.push(`${r.key}: ${r.w}% · 매달 ${won(r.monthly, true)}`
      + (r.lump ? ` · 모아둔 돈에서 ${won(r.lump, true)}` : '')
      + ` · ${r.key === '적금' ? '단리' : '월복리'} 연 ${(RATES[r.key] * 100).toFixed(1)}%`
      + ` · ${c.months}개월 뒤 예상 수익 ${won(r.gain, true)}`);
  });
  // 안전/투자 묶음 합계. AI가 "적금과 예금을 합쳐 50%"처럼 말하는 일이 잦은데,
  // 이걸 안 주면 스스로 더해서 쓰다가 숫자 검증에 걸린다(실측 재시도 원인 1위였다).
  const safe = c.w[0] + c.w[1], invest = c.w[2] + c.w[3];
  const rows = c.p.rows;
  L.push(`안전자산 합계(적금+예금): ${safe}% · 매달 ${won(rows[0].monthly + rows[1].monthly, true)}`);
  L.push(`투자자산 합계(채권+주식): ${invest}% · 매달 ${won(rows[2].monthly + rows[3].monthly, true)}`);
  const rule = ENGINE.ruleNote(risk, c.unreachable ? null : c.months);
  if (rule) L.push(`배분 규칙 적용: ${rule}`);
  L.push('상품 유형(구체적 상품명은 쓰지 말 것): 적금=은행 정기적금 자동이체, 예금=파킹통장·정기예금, 채권=국내 채권 ETF 적립매수, 주식=국내 지수 ETF 적립매수');

  const ms = milestones(a, c);
  if (ms.length) {
    L.push('', '[중간 점검 시점의 예상 잔액]');
    ms.forEach(m => L.push(`${m.n}개월 뒤(${ymAdd(m.n - 1)}): ${won(m.net)}`));
  }

  const opts = options(a, c, risk);
  if (opts.length) { L.push('', '[부족분을 메우는 조정안]'); opts.forEach(o => L.push(`- ${o}`)); }

  if (c.house) {
    const B = c.loan;
    L.push('', '[대출]');
    L.push(`목표 집값 ${won(B.price)} · 목표 시점 자기자본 ${won(c.p.net)} · 필요 대출액 ${won(B.loan)}`);
    L.push(`LTV ${Math.round(LTV * 100)}% 상한: ${won(B.cap)}${B.over ? ` · 상한을 ${won(B.over)} 초과한다` : ''}`);
    L.push(`월 상환액 ${won(B.pmt, true)} (연 4.0% · 30년 · 원리금균등) · 수입 대비 ${Math.round(B.ratio * 100)}%`);
    L.push('참고 기준: 수입 대비 상환 비율 30% 이하면 여유, 40% 초과면 대출이 어려울 수 있다. DSR 40% 규제.');
  }

  L.push('', '[세금·가정]');
  L.push(`이자·배당소득세 ${(TAX * 100).toFixed(1)}%를 뺀 세후 기준이다.`);
  L.push('수익률은 2026년 8월 기준 가정값이고 실제 상품 수익률은 다를 수 있다.');

  return L.join('\n');
}

// ---------- 2. 프롬프트 ----------

const SYSTEM = `너는 한국 사용자를 돕는 재테크 코치다. 앱의 계산 엔진이 이미 계획을 계산했고, 너는 그 결과를 사람 말로 풀어주는 역할만 맡는다.

반드시 지킬 것
1. 숫자를 새로 만들지 마라. 금액·비율·기간은 [확정 수치]에 적힌 값을 그대로 옮겨 쓴다.
2. 계산하지 마라. 두 값을 더하거나 빼거나 나눠서 새로운 숫자를 만들지 않는다. 필요한 숫자는 이미 [확정 수치]에 다 있다.
3. 특정 금융상품이나 종목을 추천하지 마라. 상품은 유형(정기적금, 국내 지수 ETF 등)까지만 말한다.
4. 수익을 보장하거나 단정하는 표현을 쓰지 마라. "~할 수 있어요", "~는 편이에요"처럼 여지를 남긴다.
5. 이 사용자의 목표·기간·성향·저축률을 구체적으로 짚어라. 누구에게나 해당되는 일반론을 쓰지 마라.
6. 존댓말로 담백하게 쓴다. 이모지를 쓰지 않는다. 각 항목은 두세 문장을 넘기지 않는다.`;

const SCHEMA = {
  type: 'object',
  properties: {
    diagnosis: { type: 'string', description: '지금 계획 상태를 두세 문장으로 진단. 판정과 부족/여유 금액을 반드시 언급한다.' },
    why: { type: 'string', description: '왜 이 자산 배분인지 두세 문장. 성향과 기간이 배분에 어떻게 반영됐는지 설명한다.' },
    steps: {
      type: 'array', description: '지금부터 할 일을 순서대로 3~4개.',
      items: {
        type: 'object',
        properties: {
          when: { type: 'string', description: '"이번 주", "이번 달 25일"처럼 짧은 시점' },
          title: { type: 'string', description: '한 줄 행동. 20자 이내' },
          detail: { type: 'string', description: '한두 문장 부연' },
        },
        required: ['when', 'title', 'detail'],
      },
    },
    risks: {
      type: 'array', description: '이 계획이 흔들릴 수 있는 지점 2~3개.',
      items: {
        type: 'object',
        properties: { title: { type: 'string' }, detail: { type: 'string' } },
        required: ['title', 'detail'],
      },
    },
    milestones: {
      type: 'array', description: '[중간 점검 시점의 예상 잔액]에 있는 시점만 쓴다. 없으면 빈 배열.',
      items: {
        type: 'object',
        properties: {
          label: { type: 'string', description: '"12개월 뒤"처럼' },
          target: { type: 'string', description: '그 시점 예상 잔액. 확정 수치에 있는 금액 그대로' },
          detail: { type: 'string', description: '이 시점에 무엇을 점검할지 한 문장' },
        },
        required: ['label', 'target', 'detail'],
      },
    },
    choice: {
      type: 'object', description: '조정안이 있을 때만. 어느 안을 권하는지와 이유.',
      properties: { pick: { type: 'string' }, reason: { type: 'string' } },
      required: ['pick', 'reason'],
    },
  },
  required: ['diagnosis', 'why', 'steps', 'risks', 'milestones'],
};

// ---------- 3. 숫자 검증 ----------

// 금액·비율·기간만 본다. "3가지", "2단계" 같은 개수는 단위가 없어 애초에 잡히지 않는다.
const NUM = /(\d[\d,]*(?:\.\d+)?)\s*(억\s*원|만\s*원|개월|%p|억|만|원|년|월|%)/g;

function tokens(text) {
  const out = new Set();
  for (const m of String(text).matchAll(NUM)) out.add(m[1].replace(/,/g, '') + m[2].replace(/\s+/g, ''));
  return out;
}

/** 문서 전체에서 토큰을 모은다. 객체·배열을 재귀로 훑는다. */
function allTokens(v, acc = new Set()) {
  if (typeof v === 'string') tokens(v).forEach(t => acc.add(t));
  else if (Array.isArray(v)) v.forEach(x => allTokens(x, acc));
  else if (v && typeof v === 'object') Object.values(v).forEach(x => allTokens(x, acc));
  return acc;
}

/** 확정 수치에서 허용 토큰을 만든다. 개월은 연 단위로 바꿔 말해도 되게 풀어준다. */
function allowList(facts) {
  const allow = tokens(facts);
  for (const t of [...allow]) {
    const m = t.match(/^(\d+)개월$/);
    if (m && Number(m[1]) % 12 === 0) allow.add(`${Number(m[1]) / 12}년`);
  }
  // 설정·규제에서 온 상수 — 확정 수치 문장에 안 들어가도 언급할 수 있다.
  ['15.4%', '70%', '40%', '30%', '0원', '1개월'].forEach(t => allow.add(t));
  return allow;
}

function verify(data, allow) {
  return [...allTokens(data)].filter(t => !allow.has(t));
}

// ---------- 3-2. 표현 검사 ----------
//
// 숫자만 막아서는 부족하다. 금융 서비스라 "보장·단정·매매 권유"는 문장 층에서도 걸러야 한다.
// 시스템 프롬프트로 요청은 하지만, 요청과 검사는 별개다 — 여기가 검사 층이다.
// 부정형("보장하지 않습니다")은 오히려 바람직한 문장이라 lookahead로 빼준다.
const BANNED = [
  [/(수익|원금|이익)(을|이)?\s*보장(?!\s*(하지|되지|할 수 없|되는 것은 아))/, '수익·원금 보장'],
  [/확실(히|한)\s*(수익|이익|상승|오)/, '단정 표현'],
  [/반드시\s*(오르|올라|상승|수익)/, '단정 표현'],
  [/무조건\s*(오르|올라|이득|수익|사)/, '단정 표현'],
  [/손해\s*(볼|볼 일|날)\s*(일\s*)?없/, '위험 부인'],
  [/(매수|매도)\s*를?\s*(권해|권합니다|권장|추천)/, '매매 권유'],
  [/(지금|당장)\s*(사|파|매수|매도)(세요|시고|십시오|는 게 좋)/, '매매 권유'],
  [/지금이\s*(기회|적기|타이밍)/, '매매 권유'],
];

/** 문서 전체에서 금지 표현을 찾는다. 반환: 걸린 사유 목록(중복 제거). */
function checkPhrases(v, hits = new Set()) {
  if (typeof v === 'string') { for (const [re, why] of BANNED) if (re.test(v)) hits.add(why); }
  else if (Array.isArray(v)) v.forEach(x => checkPhrases(x, hits));
  else if (v && typeof v === 'object') Object.values(v).forEach(x => checkPhrases(x, hits));
  return [...hits];
}

// ---------- 3-3. 템플릿 폴백 ----------
//
// 두 번 다 검증에 걸리면 AI 문장을 버리고 이 결정적 문장으로 간다.
// 숫자는 전부 엔진 값이라 검증을 통과할 수밖에 없고, 카드가 비는 일도 없다.
function templatePlan(a, c, risk) {
  const rows = c.p.rows;
  const ms = milestones(a, c);
  const safe = c.w[0] + c.w[1];
  return {
    diagnosis: c.short > 0
      ? `${c.months}개월 뒤 예상 총액은 ${won(c.p.net)}으로, 목표 ${won(c.target)}에 ${won(c.short)} 못 미칩니다. 기간이나 저축액을 조정하면 좁힐 수 있어요.`
      : `${c.months}개월 뒤 예상 총액은 ${won(c.p.net)}으로, 목표 ${won(c.target)}보다 ${won(-c.short)} 여유가 있습니다.`,
    why: `${risk} 배분이라 안전자산(적금·예금)에 ${safe}%, 투자자산(채권·주식)에 ${c.w[2] + c.w[3]}%를 담았어요. `
      + `가정 수익률은 연 ${(ENGINE.blend(c.w) * 100).toFixed(1)}%이고, 이자·배당소득세 ${(TAX * 100).toFixed(1)}%를 뺀 세후 기준입니다.`
      + (ENGINE.ruleNote(risk, c.unreachable ? null : c.months) ? ` ${ENGINE.ruleNote(risk, c.months)}` : ''),
    steps: rows.filter(r => r.w > 0).slice(0, 4).map(r => ({
      when: r.key === '적금' || r.key === '예금' ? '이번 달 자동이체일' : '매달 정기 매수일',
      title: `${r.key} ${r.w}% 넣기`,
      detail: `매달 ${won(r.monthly, true)}을 ${r.key === '적금' ? '은행 정기적금 자동이체로' : r.key === '예금' ? '파킹통장·정기예금으로' : r.key === '채권' ? '국내 채권 ETF 적립매수로' : '국내 지수 ETF 적립매수로'} 넣습니다.`,
    })),
    risks: [
      { title: '가정 수익률과 실제가 다를 수 있어요', detail: `연 ${(ENGINE.blend(c.w) * 100).toFixed(1)}%는 가정값입니다. 실제 상품 수익률에 따라 ${won(c.p.gain)}이라는 예상 수익은 달라질 수 있어요.` },
      ...(c.w[3] > 0 && c.months < 36
        ? [{ title: '목표 시점이 가까운데 주식이 들어 있어요', detail: `주식 ${c.w[3]}% 비중이라 목표 시점에 손실 상태일 수 있어요. 목표일이 가까워지면 비중을 줄이는 걸 권해요.` }]
        : [{ title: '저축이 밀리면 계획이 흔들려요', detail: `매달 ${won(a.saving)}이 계획대로 들어가는지 점검하세요.` }]),
    ],
    milestones: ms.map(m => ({ label: `${m.n}개월 뒤`, target: won(m.net), detail: `이 시점에 ${won(m.net)}이 모였는지 확인하세요.` })),
  };
}

// ---------- 4. 진입점 ----------

/** 같은 입력이면 같은 결과를 재사용하도록 계획 상태를 한 줄로 접는다. */
function planKey(a, risk) {
  return [a.goalType, a.amount, a.months, a.lump, a.income, a.expense, a.saving, risk].join('|');
}

/**
 * 계획을 AI가 풀어 쓴 상세본을 만든다.
 * 반환: { data, model, ms, verified, retried, corrected, fallback, facts }
 *   verified true  … 숫자·표현 검사를 통과한 AI 문장
 *   fallback true  … 두 번 다 걸려서 AI 문장을 버리고 템플릿으로 간 것
 * AI 호출 자체가 실패하면(키·한도·네트워크) throw 한다.
 */
async function buildDetailedPlan({ a, c, risk, signal }) {
  const facts = factSheet(a, c, risk);
  const allow = allowList(facts);
  const base = `[확정 수치]\n${facts}\n\n위 [확정 수치]만 근거로, 이 사람의 계획을 풀어서 설명해 줘.`;

  /** 숫자 + 표현을 한 번에 본다. 통과면 빈 배열. */
  const inspect = data => [
    ...verify(data, allow).map(t => `없는 숫자 ${t}`),
    ...checkPhrases(data),
  ];

  let retried = false, corrected = [];
  let res = await callGemini({ system: SYSTEM, user: base, schema: SCHEMA, signal });
  let bad = inspect(res.data);

  if (bad.length) {
    // 한 번 더: 무엇이 걸렸는지 그대로 짚어준다.
    retried = true; corrected = bad;
    const fix = `${base}\n\n[재작성 요청]\n직전 답변에서 다음이 걸렸다: ${bad.join(', ')}\n`
      + '[확정 수치]에 적힌 값만 쓰고, 수익을 보장하거나 단정하는 표현과 매수·매도 권유는 빼고 처음부터 다시 작성해라.';
    res = await callGemini({ system: SYSTEM, user: fix, schema: SCHEMA, signal });
    bad = inspect(res.data);
  }

  // 두 번째도 걸리면 AI 문장을 버리고 엔진 값으로 만든 템플릿 문장을 쓴다.
  if (bad.length) {
    return { data: templatePlan(a, c, risk), model: res.model, ms: res.ms,
             verified: false, fallback: true, retried, corrected: bad, facts };
  }

  return { ...res, verified: true, fallback: false, retried, corrected, facts };
}

export { factSheet, allowList, verify, tokens, checkPhrases, templatePlan, planKey, buildDetailedPlan, SYSTEM, SCHEMA };
