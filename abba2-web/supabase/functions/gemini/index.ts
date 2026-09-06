// Gemini 호출을 대신 해주는 Edge Function.
// gemini.js에 있던 "모델 순서대로 시도 + 에러 분류" 로직을 그대로 옮겼다.
// 다른 점은 딱 하나: API 키가 여기(Deno.env, 서버)에만 있고 브라우저로 내려가지 않는다는 것.
//
// 응답 규칙: 예상 가능한 실패(키 거부·한도 초과·타임아웃 등)는 항상 HTTP 200 +
// { error: { code, message } } 로 돌려준다. 클라이언트가 supabase-js의 invoke()로
// 호출할 때 상태 코드별 분기를 새로 짤 필요 없이, 응답 바디만 보면 되게 하기 위해서다.
// 진짜 예상 못 한 예외만 500으로 떨어진다.

const MODELS = ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-3-flash-preview'];
const ENDPOINT = (m: string) => `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`;
const TIMEOUT = 25000;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function ok(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200, headers: { ...CORS, 'content-type': 'application/json' } });
}

function fail(code: string, message: string) {
  return ok({ error: { code, message } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return fail('parse', '요청 형식이 잘못됐어요.');
  }

  const { system, user, schema, maxOutputTokens = 2048, userKey } = payload ?? {};
  if (!user) return fail('http', 'user 프롬프트가 없어요.');

  // 설정 화면에서 넣은 개인 키가 오면 그걸 쓰고, 없으면 서버 기본 키(비밀 환경변수)를 쓴다.
  const key = userKey || Deno.env.get('GEMINI_API_KEY');
  if (!key) return fail('no-key', 'API 키가 없어요.');

  const body = {
    contents: [{ role: 'user', parts: [{ text: user }] }],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens,
      thinkingConfig: { thinkingBudget: 0 },
      ...(schema ? { responseMimeType: 'application/json', responseSchema: schema } : {}),
    },
    ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
  };

  let last = { code: 'http', message: '요청이 실패했어요.' };

  for (const model of MODELS) {
    const t0 = Date.now();
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), TIMEOUT);
    try {
      const res = await fetch(ENDPOINT(model), {
        method: 'POST',
        headers: { 'x-goog-api-key': key, 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: ctl.signal,
      });

      if (!res.ok) {
        // 키 문제는 모델을 바꿔도 똑같으니 즉시 반환. 나머지는 다음 모델로 넘어간다.
        if (res.status === 401 || res.status === 403) return fail('auth', 'API 키가 거부됐어요.');
        if (res.status === 429) { last = { code: 'quota', message: '오늘 무료 사용량을 다 썼어요.' }; continue; }
        if (res.status === 503) { last = { code: 'busy', message: '지금 모델이 붐벼요.' }; continue; }
        last = { code: res.status === 400 ? 'param' : 'http', message: '요청이 실패했어요.' };
        continue;
      }

      const j = await res.json();
      const cand = j.candidates?.[0];
      if (!cand || cand.finishReason === 'SAFETY') return fail('blocked', '안전 필터에 걸려 답을 만들지 못했어요.');
      const text = cand.content?.parts?.map((p: any) => p.text).filter(Boolean).join('') ?? '';
      if (!text) return fail('parse', '응답이 비어 있어요.');

      let data: any = text;
      if (schema) {
        try { data = JSON.parse(text); } catch { return fail('parse', '응답 형식이 예상과 달라요.'); }
      }
      return ok({ data, model, ms: Date.now() - t0 });
    } catch {
      last = { code: ctl.signal.aborted ? 'timeout' : 'network', message: ctl.signal.aborted ? '응답이 너무 늦어요.' : '네트워크에 연결하지 못했어요.' };
      continue;
    } finally {
      clearTimeout(timer);
    }
  }

  return fail(last.code, last.message);
});