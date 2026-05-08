import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { login } from '../lib/auth'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as any)?.from || '/'

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!username.trim() || !password) { setError('Enter your username and password'); return }
    setLoading(true); setError('')
    // Small delay for UX feel
    await new Promise(r => setTimeout(r, 400))
    const ok = login(username, password)
    if (ok) {
      navigate(from, { replace: true })
    } else {
      setError('Incorrect username or password')
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--off-white)', padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 44, height: 44, background: 'var(--orange)', borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
            fontFamily: 'var(--font-head)', fontSize: 20, fontWeight: 800, color: 'white',
          }}>S</div>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 18, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Strat<span style={{ color: 'var(--orange)' }}>Intel</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4, fontFamily: 'var(--font-body)' }}>
            AI Form Intelligence · stratai.io
          </div>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: '28px 28px 24px' }}>
          <div style={{ marginBottom: 22 }}>
            <div style={{
              fontFamily: 'var(--font-head)', fontSize: 14, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4,
            }}>Sign In</div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>
              Access the StratIntel dashboard
            </div>
          </div>

          <form onSubmit={handleSubmit} autoComplete="off">
            <div className="field-group">
              <label className="field-label">Username</label>
              <input
                className="field-input"
                type="text"
                value={username}
                onChange={e => { setUsername(e.target.value); setError('') }}
                placeholder="Enter username"
                autoFocus
                autoComplete="username"
              />
            </div>

            <div className="field-group" style={{ marginBottom: 0 }}>
              <label className="field-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="field-input"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  placeholder="Enter password"
                  style={{ paddingRight: 52 }}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 11, fontFamily: 'var(--font-head)', fontWeight: 600,
                    textTransform: 'uppercase', letterSpacing: '0.3px', color: 'var(--text3)',
                  }}
                >{showPass ? 'Hide' : 'Show'}</button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                marginTop: 12, padding: '9px 12px', borderRadius: 'var(--r)',
                background: 'rgba(192,57,43,0.06)', border: '1px solid rgba(192,57,43,0.2)',
                fontSize: 12, color: 'var(--danger)', borderLeft: '3px solid var(--danger)',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', marginTop: 20, justifyContent: 'center', padding: '11px' }}
            >
              {loading
                ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderTopColor: 'rgba(255,255,255,0.8)' }} /> Signing in…</>
                : 'Sign In →'
              }
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 11, color: 'var(--text3)' }}>
          StratIntel · stratai.io · Internal tool
        </div>
      </div>
    </div>
  )
}
