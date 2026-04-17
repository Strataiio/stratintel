// Simple localStorage-based auth for internal tool protection
// Credentials are checked client-side — suitable for internal tools
// For enterprise security, replace with Supabase Auth or similar

export const AUTH_KEY = 'stratintel_auth'
export const SESSION_KEY = 'stratintel_session'

// Credentials stored as env vars — set in Vercel dashboard
// Fallback to defaults for dev
function getCreds() {
  return {
    username: import.meta.env.VITE_ADMIN_USER || 'admin',
    password: import.meta.env.VITE_ADMIN_PASS || 'stratai2024',
  }
}

export function login(username: string, password: string): boolean {
  const creds = getCreds()
  if (
    username.trim().toLowerCase() === creds.username.toLowerCase() &&
    password === creds.password
  ) {
    const session = {
      user: username.trim().toLowerCase(),
      loginAt: Date.now(),
      expiresAt: Date.now() + 8 * 60 * 60 * 1000, // 8 hour session
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    return true
  }
  return false
}

export function logout() {
  localStorage.removeItem(SESSION_KEY)
}

export function isAuthenticated(): boolean {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return false
    const session = JSON.parse(raw)
    if (!session?.expiresAt) return false
    if (Date.now() > session.expiresAt) {
      localStorage.removeItem(SESSION_KEY)
      return false
    }
    return true
  } catch {
    return false
  }
}

export function getUser(): string | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw)?.user || null
  } catch {
    return null
  }
}
