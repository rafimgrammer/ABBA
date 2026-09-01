// Gemini 호출부. 브라우저에서 REST를 직접 친다(SDK를 넣지 않는다).
//
// 모델 선택 근거 (2026-09-01 실측, 같은 프롬프트/스키마)
//   gemini-3.5-flash       thinkingBudget:0 → 2.1초   ← 1순위. 품질·속도 균형
//   gemini-3.1-flash-lite                   → 1.0초      문장은 밋밋하지만 빠르고 한도가 넉넉하다
//   gemini-3-flash-preview                  → 1.7초
//   gemini-3.5-flash-lite  thinkingBudget 미지원 → 400  제외
//   gemini-3.6-flash       thinkingBudget 미지원 → 16.6초  카드 하나에 쓰기엔 너무 느리다
//   gemini-3.7-flash                        → 503        수요 몰림, 아직 불안정
//   gemini-2.5-flash                        → 404        신규 사용자에게 더 이상 열리지 않는다
import { getKey } from './apiKey.js';

// 무료 등급 한도는 모델마다 따로 잡힌다(gemini-3.5-flash는 프로젝트·모델당 하루 20회).
// 그래서 429도 다음 모델로 넘어간다 — 시연 도중 한도에 걸려도 카드가 계속 뜨게 하려는 목적이다.
// 앞쪽일수록 문장 품질이 좋고, 뒤로 갈수록 가볍고 한도가 넉넉하다.
const MODELS = ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-3-flash-preview'];
const ENDPOINT = m => `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`;
const TIMEOUT = 25000;

/** 화면에 그대로 띄울 수 있는 한국어 사유. code는 로그·분기용. */
class GeminiError extends Error {
  constructor(code, msg) { super(msg); this.code = code; }
}

const MSG = {
  'no-key': 'API 키가 없어요. 설정에서 넣어주세요.',
  timeout: '응답이 너무 늦어요. 잠시 뒤 다시 시도해 주세요.',
  network: '네트워크에 연결하지 못했어요.',
  auth: 'API 키가 거부됐어요. 설정에서 키를 확인해 주세요.',
  quota: '오늘 무료 사용량을 다 썼어요. 설정에서 내 API 키를 넣거나 내일 다시 시도해 주세요.',
  busy: '지금 모델이 붐벼요. 잠시 뒤 다시 시도해 주세요.',
  blocked: '안전 필터에 걸려 답을 만들지 못했어요.',
  parse: '응답 형식이 예상과 달라요.',
  param: '이 모델이 요청을 받지 않았어요.',
  http: '요청이 실패했어요.',
};

const err = code => new GeminiError(code, MSG[code] ?? MSG.http);

/**
 * 구조화 출력 한 번 호출. schema를 주면 JSON 객체를, 안 주면 문자열을 돌려준다.
 * 반환: { data, model, ms }
 */
async function callGemini({ system, user, schema, signal, maxOutputTokens = 2048 }) {
  const key = getKey();
  if (!key) throw err('no-key');

  const body = {
    contents: [{ role: 'user', parts: [{ text: user }] }],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens,
      // 카드 하나 띄우는 데 사고 토큰을 쓸 이유가 없다. 이게 16초 → 2초를 만든다.
      thinkingConfig: { thinkingBudget: 0 },
      ...(schema ? { responseMimeType: 'application/json', responseSchema: schema } : {}),
    },
    ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
  };

  let last = err('http');
  for (const model of MODELS) {
    const t0 = Date.now();
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort('timeout'), TIMEOUT);
    const onAbort = () => ctl.abort('caller');
    signal?.addEventListener('abort', onAbort);
    try {
      const res = await fetch(ENDPOINT(model), {
        method: 'POST',
        headers: { 'x-goog-api-key': key, 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: ctl.signal,
      });
      if (!res.ok) {
        // 다음 모델로 넘어갈 만한 것: 404(모델 정리됨) · 503(붐빔) · 429(그 모델 한도 소진)
        //   400도 넘어간다 — 모델마다 지원 파라미터가 달라서 나는 경우가 실제로 있었다
        //   (gemini-3.5-flash-lite·3.6-flash는 thinkingBudget을 거부한다).
        // 키 문제(401/403)만 모델을 바꿔도 같으므로 즉시 실패시킨다.
        if (res.status === 401 || res.status === 403) throw err('auth');
        if (res.status === 429) { last = err('quota'); continue; }
        if (res.status === 503) { last = err('busy'); continue; }
        last = err(res.status === 400 ? 'param' : 'http');
        continue;
      }
      const j = await res.json();
      const cand = j.candidates?.[0];
      if (!cand || cand.finishReason === 'SAFETY') throw err('blocked');
      const text = cand.content?.parts?.map(p => p.text).filter(Boolean).join('') ?? '';
      if (!text) throw err('parse');
      let data = text;
      if (schema) {
        try { data = JSON.parse(text); } catch { throw err('parse'); }
      }
      return { data, model, ms: Date.now() - t0 };
    } catch (e) {
      if (e instanceof GeminiError) { if (['http', 'param', 'busy', 'quota'].includes(e.code)) { last = e; continue; } throw e; }
      if (ctl.signal.reason === 'caller') throw e;                 // 화면이 떠나서 취소한 것
      throw err(ctl.signal.aborted ? 'timeout' : 'network');
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    }
  }
  throw last;
}

/** 자동 호출을 걸지 말아야 하는 환경인지. UI 테스트(Playwright)에서는 네트워크를 타지 않는다. */
function autoRunAllowed() {
  if (typeof window !== 'undefined' && window.__ABBA_AI_AUTO === true) return true;    // 자동화에서 일부러 켤 때
  if (typeof window !== 'undefined' && window.__ABBA_AI_AUTO === false) return false;
  if (typeof navigator !== 'undefined' && navigator.webdriver) return false;           // UI 테스트는 네트워크를 타지 않는다
  return true;
}

export { callGemini, GeminiError, autoRunAllowed, MODELS };
