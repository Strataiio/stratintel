import React from 'react'
import { useNavigate } from 'react-router-dom'

export default function Topbar({ right }: { right?: React.ReactNode }) {
  const navigate = useNavigate()
  return (
    <header className="topbar">
      <div className="logo" onClick={() => navigate('/')} role="button">
        <div className="logo-mark">S</div>
        <div className="logo-text">Strat<span>Intel</span></div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {right}
      </div>
    </header>
  )
}
