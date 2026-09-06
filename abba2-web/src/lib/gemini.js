// Gemini 호출부. 실제 구글 API 통신은 Supabase Edge Function(gemini)이 대신한다.
// 여기엔 API 키가 없다 — 서버 기본 키는 Edge Function 쪽 환경변수에만 있고,
// 개인 키(설정 화면에서 넣은 값)만 요청 본문에 실려서 나간다.
//
// 모델 선택 근거 (2026-09-01 실측, 같은 프롬프트/스키마) — 실제 시도 순서는
// Edge Function이 관리한다. 여기 배열은 설정 화면 등에서 참고용으로만 쓴다.
//   gemini-3.5-flash       thinkingBudget:0 → 2.1초   ← 1순위. 품질·속도 균형
//   gemini-3.1-flash-lite                   → 1.0초      문장은 밋밋하지만 빠르고 한도가 넉넉하다
//   gemini-3-flash-preview                  → 1.7초
import { getKey } from './apiKey.js';
import { supabase } from '../supabaseClient.js';

const MODELS = ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-3-flash-preview'];

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
 *
 * 참고: signal로 넘어온 취소는 Edge Function 요청 자체를 중단시키지는 않는다
 * (supabase-js invoke가 AbortSignal을 직접 받지 않는다). 다만 결과가 와도
 * aiCoach.js 쪽에서 signal.aborted를 확인해 오래된 결과는 버리므로, 화면에
 * 잘못된 결과가 뜨는 일은 없다. 서버 자원 낭비만 약간 있을 수 있는 정도다.
 */
async function callGemini({ system, user, schema, signal, maxOutputTokens = 2048 }) {
  const userKey = getKey() || undefined;   // 개인 키가 있으면 실어 보내고, 없으면 서버 기본 키를 쓴다.

  const { data, error } = await supabase.functions.invoke('gemini', {
    body: { system, user, schema, maxOutputTokens, userKey },
  });

  if (signal?.aborted) throw err('network');

  if (error) throw err('network');           // Edge Function 자체를 못 부른 경우 (네트워크, 배포 안 됨 등)
  if (data?.error) throw err(data.error.code);   // Edge Function이 정상 응답했지만 내용이 실패인 경우

  return { data: data.data, model: data.model, ms: data.ms };
}

/** 자동 호출을 걸지 말아야 하는 환경인지. UI 테스트(Playwright)에서는 네트워크를 타지 않는다. */
function autoRunAllowed() {
  if (typeof window !== 'undefined' && window.__ABBA_AI_AUTO === true) return true;    // 자동화에서 일부러 켤 때
  if (typeof window !== 'undefined' && window.__ABBA_AI_AUTO === false) return false;
  if (typeof navigator !== 'undefined' && navigator.webdriver) return false;           // UI 테스트는 네트워크를 타지 않는다
  return true;
}

export { callGemini, GeminiError, autoRunAllowed, MODELS };