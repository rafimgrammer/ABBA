import { supabase } from '../supabaseClient'

function LoginModal({ onClose }) {
  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    })
    if (error) console.error('로그인 에러:', error)
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <button style={styles.closeBtn} onClick={onClose}>✕</button>

        <div style={styles.logoRow}>
          <div style={styles.logoDot}></div>
          <span style={styles.logoText}>ABBA <span style={{ color: '#1D9E75' }}>2.0</span></span>
        </div>

        <h1 style={styles.title}>시작하기</h1>
        <p style={styles.subtitle}>구글 계정 하나면 끝나요. 계좌 연결이나 자산 정보는 필요하지 않습니다.</p>

        <button style={styles.googleBtn} onClick={handleGoogleLogin}>
          <GoogleIcon />
          Google로 계속하기
        </button>

        <p style={styles.lockText}>🔒 가입은 구글 계정 하나면 끝납니다.</p>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.95v2.33A9 9 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.05l3.02-2.33z"/>
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.95l3.02 2.33C4.68 5.16 6.66 3.58 9 3.58z"/>
    </svg>
  )
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(15,20,18,0.55)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  },
  modal: {
    width: 380, background: '#fff', borderRadius: 16,
    padding: '2rem 1.75rem 1.75rem', position: 'relative',
    boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
  },
  closeBtn: {
    position: 'absolute', top: 14, right: 14, width: 28, height: 28,
    border: 'none', background: 'transparent', color: '#888', fontSize: 16, cursor: 'pointer',
  },
  logoRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.5rem' },
  logoDot: { width: 22, height: 22, borderRadius: 6, background: '#1D9E75' },
  logoText: { fontSize: 16, fontWeight: 500 },
  title: { fontSize: 20, margin: '0 0 6px' },
  subtitle: { fontSize: 14, color: '#666', margin: '0 0 1.5rem', lineHeight: 1.5 },
  googleBtn: {
    width: '100%', height: 46, borderRadius: 10, border: '1px solid #ddd',
    background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 10, fontSize: 14, fontWeight: 500, cursor: 'pointer',
  },
  lockText: { fontSize: 12, color: '#999', textAlign: 'center', marginTop: '1.25rem' },
}

export default LoginModal