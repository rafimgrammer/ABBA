// Gemini API 키. 저장소에는 절대 들어가지 않는다.
//
// 왜 이렇게 바꿨나
//   예전에는 키 문자열이 이 파일에 그대로 박혀 있었고 빌드 산출물(dist/*.html)에도 실렸다.
//   그래서 GitHub Push Protection이 푸시를 막았다. 지금은 두 경로로만 들어온다.
//
//     1) 빌드 시점 — .env.local 의 VITE_GEMINI_API_KEY  (.gitignore 대상이라 커밋되지 않는다)
//     2) 실행 시점 — 설정 화면에서 넣은 키 (localStorage. 이 브라우저에만 남는다)
//
//   둘 다 없으면 AI 카드만 "키가 없어요"를 띄우고 나머지 화면은 그대로 동작한다.
//   백엔드(Supabase Edge Function)로 옮길 때 고칠 파일은 이 파일과 gemini.js 둘뿐이다.

// Vite가 빌드할 때 값을 끼워 넣는다. .env.local이 없으면 빈 문자열이 된다.
// Node로 lib을 직접 돌려 검증할 때는 process.env에서 읽는다(그 경로를 살려두려는 목적).
const FROM_ENV =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) ||
  globalThis.process?.env?.VITE_GEMINI_API_KEY ||
  '';

const LS = 'abba2.gemini.key';

/** 브라우저에 저장한 개인 키가 있으면 그걸 쓰고, 없으면 빌드에 주입된 키로 떨어진다. */
function getKey() {
  try { return localStorage.getItem(LS) || FROM_ENV; } catch { return FROM_ENV; }
}

/** 설정 화면에서 키를 넣으면 이 브라우저에서만 그 키를 쓴다. */
function setKey(k) {
  try { k ? localStorage.setItem(LS, k) : localStorage.removeItem(LS); } catch { /* file://에서 막힐 수 있다 */ }
}

/** 빌드에 주입된 키를 쓰는 중인지 (설정 화면 표시용). */
function usingBuiltIn() { return !!FROM_ENV && getKey() === FROM_ENV; }

/** 키가 아예 없는 상태인지. */
function hasKey() { return !!getKey(); }

/** 화면에 보여줄 때는 앞뒤만 남긴다. */
function maskKey(k = getKey()) {
  if (!k) return '설정 안 됨';
  return k.length > 14 ? `${k.slice(0, 8)}…${k.slice(-4)}` : '설정됨';
}

export { getKey, setKey, usingBuiltIn, hasKey, maskKey };
