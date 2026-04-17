import React from 'react'
import { useNavigate } from 'react-router-dom'
import Topbar from '../components/Topbar'

export default function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="app">
      <Topbar />
      <div className="main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 56px)' }}>
        <div className="fade-up" style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{
            width: 56, height: 56, background: 'var(--orange)', borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px', fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 800, color: 'white'
          }}>S</div>
          <div className="eyebrow" style={{ marginBottom: 8 }}>404</div>
          <h1 style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 10 }}>
            Page Not Found
          </h1>
          <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 28, lineHeight: 1.65 }}>
            This page doesn't exist or you don't have access to it.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
