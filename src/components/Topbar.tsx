import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { isAuthenticated, logout, getUser } from '../lib/auth'

export default function Topbar({ right }: { right?: React.ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const authenticated = isAuthenticated()
  const user = getUser()

  // Don't show user/logout on public fill form pages
  const isPublicPage = location.pathname.startsWith('/f/')

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <header className="topbar">
      <div className="logo" onClick={() => authenticated ? navigate('/') : null}
        style={{ cursor: authenticated ? 'pointer' : 'default' }}>
        <div className="logo-mark">S</div>
        <div className="logo-text">Strat<span>Intel</span></div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {right}
        {authenticated && !isPublicPage && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 8, borderLeft: '1px solid var(--border)', marginLeft: 4 }}>
            <span style={{
              fontSize: 11, color: 'var(--text3)',
              fontFamily: 'var(--font-mono)',
              display: 'flex', alignItems: 'center', gap: 5
            }}>
              <span style={{
                width: 6, height: 6, background: 'var(--success)',
                borderRadius: '50%', display: 'inline-block', flexShrink: 0
              }} />
              {user}
            </span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleLogout}
              style={{ fontSize: 11, padding: '4px 10px' }}
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
