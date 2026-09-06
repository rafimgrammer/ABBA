// Gemini API 키. 이제 이 파일은 "개인 키로 덮어쓰기" 기능만 담당한다.
//
// 왜 이렇게 바꿨나
//   전에는 빌드 시점에 .env.local의 VITE_GEMINI_API_KEY를 이 파일이 읽어와
//   기본값으로 썼다. Vite는 이 값을 번들(dist/*.js)에 문자열 그대로 박아 넣기 때문에,
//   브라우저 개발자 도구로 누구나 그 키를 볼 수 있었다 — 진짜 노출 지점은 이 파일이
//   아니라 이 값을 그대로 구글에 실어 보내던 gemini.js였지만, 값이 애초에 여기서
//   브라우저로 흘러 들어온 게 원인이었다.
//
//   지금은 기본 키가 Supabase Edge Function(서버) 안에만 있고 브라우저로 내려오지
//   않는다. 그래서 FROM_ENV 로직 자체를 없앴다. 이 파일은 이제 "사용자가 설정
//   화면에서 자기 키를 넣었을 때만" 그 값을 기억했다가 gemini.js가 요청 보낼 때
//   실어 보내게 해주는 역할만 한다 (개인 키는 프로젝트 비밀이 아니라 사용자 본인의
//   값이라, 요청 본문에 실려 나가도 문제되지 않는다).

const LS = 'abba2.gemini.key';

/** 사용자가 설정 화면에서 넣은 개인 키. 없으면 빈 문자열(=서버 기본 키 사용). */
function getKey() {
  try { return localStorage.getItem(LS) || ''; } catch { return ''; }
}

/** 설정 화면에서 키를 넣으면 이 브라우저에서만 그 키를 쓴다. 빈 값을 넣으면 서버 기본 키로 되돌아간다. */
function setKey(k) {
  try { k ? localStorage.setItem(LS, k) : localStorage.removeItem(LS); } catch { /* file://에서 막힐 수 있다 */ }
}

/** 서버 기본 키를 쓰는 중인지 (설정 화면 표시용). 개인 키를 안 넣었으면 true. */
function usingBuiltIn() { return !getKey(); }

/** 항상 true — 서버(Edge Function)가 기본 키를 갖고 있어서 키가 아예 없는 상태는 없다. */
function hasKey() { return true; }

/** 화면에 보여줄 때는 앞뒤만 남긴다. 개인 키가 없으면 "서버 기본 키 사용 중"이라고 표시. */
function maskKey(k = getKey()) {
  if (!k) return '서버 기본 키 사용 중';
  return k.length > 14 ? `${k.slice(0, 8)}…${k.slice(-4)}` : '설정됨';
}

export { getKey, setKey, usingBuiltIn, hasKey, maskKey };