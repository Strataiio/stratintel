import React, { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, StratForm } from '../lib/supabase'
import { genId, showToast, formatDate } from '../lib/utils'
import {
  getGeminiApiKey, setGeminiApiKey, clearGeminiApiKey, testGeminiApiKey, GEMINI_KEY_STORAGE
} from '../lib/gemini'
import Topbar from '../components/Topbar'
import {
  IconPlus, IconTrash, IconLink, IconEye, IconEdit,
  IconResponses, IconCopy, IconSettings, IconKey, IconX, IconShield, IconCheck, IconSparkle
} from '../components/Icons'

// ── Settings Drawer ──────────────────────────────────────────────────────────
function SettingsDrawer({ onClose }: { onClose: () => void }) {
  const [apiKey, setApiKey] = useState(getGeminiApiKey())
  const [showKey, setShowKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; model?: string; error?: string } | null>(null)
  const [saved, setSaved] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Detect if the current key came from env or localStorage
  const envKey = import.meta.env.VITE_GEMINI_API_KEY || ''
  const storedKey = localStorage.getItem(GEMINI_KEY_STORAGE) || ''
  const usingEnvKey = !storedKey && !!envKey
  const hasKey = !!apiKey.trim()

  async function handleTest() {
    if (!apiKey.trim()) { showToast('Enter an API key first'); return }
    setTesting(true); setTestResult(null)
    const result = await testGeminiApiKey(apiKey.trim())
    setTestResult(result)
    setTesting(false)
  }

  function handleSave() {
    setGeminiApiKey(apiKey)
    setSaved(true)
    setTestResult(null)
    showToast('API key saved')
    setTimeout(() => setSaved(false), 2000)
  }

  function handleClear() {
    if (!confirm('Remove the saved API key? The system will fall back to the environment variable if set.')) return
    clearGeminiApiKey()
    setApiKey(envKey || '')
    setTestResult(null)
    showToast('API key cleared')
  }

  function maskKey(k: string) {
    if (!k || k.length < 12) return k
    return k.slice(0, 8) + '•'.repeat(Math.min(k.length - 12, 20)) + k.slice(-4)
  }

  return (
    <>
      {/* Overlay */}
      <div className="drawer-overlay" onClick={onClose} />

      {/* Drawer */}
      <div className="drawer">
        {/* Header */}
        <div className="drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconSettings />
            <span className="drawer-title">Settings</span>
          </div>
          <button className="btn-icon" onClick={onClose}><IconX /></button>
        </div>

        {/* Body */}
        <div className="drawer-body">

          {/* ── API Key Section ── */}
          <div className="drawer-section">
            <div className="drawer-section-title">Gemini AI · API Key</div>

            {/* Current status */}
            {hasKey ? (
              <div className={`key-status ${testResult ? (testResult.ok ? 'ok' : 'error') : 'ok'}`}>
                {testResult ? (
                  testResult.ok
                    ? <><IconCheck /> Key valid · using <code style={{ fontSize:11 }}>{testResult.model}</code></>
                    : <><span style={{ fontSize:14 }}>⚠</span> {testResult.error}</>
                ) : (
                  usingEnvKey
                    ? <><IconShield /> Using environment key (set in Vercel)</>
                    : <><IconShield /> Custom key saved in this browser</>
                )}
              </div>
            ) : (
              <div className="key-status error">
                <span style={{ fontSize: 14 }}>⚠</span> No API key configured
              </div>
            )}

            {/* Input */}
            <div className="field-group">
              <label className="field-label">
                <span style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <IconKey /> Gemini API Key
                </span>
              </label>
              <div className="key-input-wrap">
                <input
                  ref={inputRef}
                  className="field-input"
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  placeholder="AIza••••••••••••••••••••••••••••••••••"
                  onChange={e => { setApiKey(e.target.value); setTestResult(null); setSaved(false) }}
                  onKeyDown={e => { if (e.key === 'Enter') handleTest() }}
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  className="key-toggle-btn"
                  onClick={() => setShowKey(v => !v)}
                  type="button"
                >
                  {showKey ? 'Hide' : 'Show'}
                </button>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6, lineHeight: 1.7 }}>
                Your key is stored locally in this browser only — never sent to our servers.
                Get one free at{' '}
                <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer"
                   style={{ color: 'var(--orange)' }}>
                  aistudio.google.com/apikey
                </a>
              </p>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleSave}
                disabled={!apiKey.trim() || saved}
              >
                {saved ? <><IconCheck /> Saved</> : 'Save Key'}
              </button>
              <button
                className="btn btn-sm"
                onClick={handleTest}
                disabled={testing || !apiKey.trim()}
              >
                {testing ? <><div className="spinner" style={{ width:12, height:12, borderWidth:2 }} /> Testing…</> : <><IconSparkle /> Test Key</>}
              </button>
              {storedKey && (
                <button className="btn btn-sm btn-danger" onClick={handleClear}>
                  Clear Saved Key
                </button>
              )}
            </div>

            {/* Test result detail */}
            {testResult && (
              <div style={{
                marginTop: 12, padding: '10px 14px', borderRadius: 'var(--r)',
                background: testResult.ok ? '#e8f5ee' : 'rgba(192,57,43,0.06)',
                border: `1px solid ${testResult.ok ? '#b6ddc8' : 'rgba(192,57,43,0.2)'}`,
                fontSize: 12, lineHeight: 1.7,
                color: testResult.ok ? 'var(--success)' : 'var(--danger)',
              }}>
                {testResult.ok
                  ? <>✓ Connection successful · Gemini model: <strong>{testResult.model}</strong><br />Your AI engine is ready.</>
                  : <>{testResult.error}
                      <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer"
                         style={{ display:'block', marginTop:6, color:'var(--orange)', fontFamily:'var(--font-mono)', fontSize:11 }}>
                        → aistudio.google.com/apikey
                      </a>
                    </>
                }
              </div>
            )}
          </div>

          {/* ── How it works ── */}
          <div className="drawer-section">
            <div className="drawer-section-title">How Key Priority Works</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.85 }}>
              {[
                ['1st', 'Key saved here in browser (overrides all)', 'var(--orange)'],
                ['2nd', 'VITE_GEMINI_API_KEY in Vercel env vars', 'var(--text3)'],
              ].map(([step, desc, col]) => (
                <div key={step as string} style={{ display:'flex', gap:10, marginBottom:8 }}>
                  <span style={{
                    fontFamily:'var(--font-head)', fontWeight:700, fontSize:10,
                    color: col as string, width:28, flexShrink:0, paddingTop:1
                  }}>{step as string}</span>
                  <span>{desc as string}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Quick links ── */}
          <div className="drawer-section">
            <div className="drawer-section-title">Quick Links</div>
            {[
              ['Get API Key', 'https://aistudio.google.com/apikey', 'Free from Google AI Studio'],
              ['Vercel Env Vars', 'https://vercel.com/dashboard', 'Update VITE_GEMINI_API_KEY'],
              ['GitHub Repo', 'https://github.com/Strataiio/stratintel', 'Source code'],
            ].map(([label, url, hint]) => (
              <a key={url as string} href={url as string} target="_blank" rel="noreferrer"
                style={{
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                  padding:'10px 12px', borderRadius:'var(--r)',
                  border:'1px solid var(--border)', marginBottom:8,
                  textDecoration:'none', background:'var(--off-white)',
                  transition:'border-color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--orange)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                <div>
                  <div style={{ fontSize:13, fontWeight:500, color:'var(--text)' }}>{label as string}</div>
                  <div style={{ fontSize:11, color:'var(--text3)', fontFamily:'var(--font-mono)' }}>{hint as string}</div>
                </div>
                <span style={{ fontSize:14, color:'var(--text3)' }}>↗</span>
              </a>
            ))}
          </div>

          {/* ── Version ── */}
          <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)', textAlign:'center', paddingTop:8 }}>
            StratIntel v1.0 · stratai.io · Gemini + Supabase
          </div>
        </div>

        {/* Footer */}
        <div className="drawer-footer">
          <button className="btn" style={{ width:'100%' }} onClick={onClose}>Done</button>
        </div>
      </div>
    </>
  )
}

// ── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate()
  const [forms, setForms] = useState<StratForm[]>([])
  const [loading, setLoading] = useState(true)
  const [respCounts, setRespCounts] = useState<Record<string, number>>({})
  const [duplicating, setDuplicating] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  // API key health indicator for topbar
  const hasApiKey = !!getGeminiApiKey()

  useEffect(() => { loadForms() }, [])

  async function loadForms() {
    setLoading(true)
    const { data } = await supabase.from('strat_forms').select('*').order('created_at', { ascending: false })
    if (data) {
      setForms(data)
      const counts: Record<string, number> = {}
      await Promise.all(data.map(async f => {
        const { count } = await supabase.from('strat_responses').select('id', { count: 'exact', head: true }).eq('form_id', f.id)
        counts[f.id] = count ?? 0
      }))
      setRespCounts(counts)
    }
    setLoading(false)
  }

  async function createNew() {
    const id = genId()
    const { error } = await supabase.from('strat_forms').insert({
      id, title: '', description: '', ai_instructions: '',
      fields: [], published: false, ai_enabled: true, redirect_url: ''
    })
    if (error) { showToast('Error: ' + error.message); return }
    navigate(`/builder/${id}`)
  }

  async function duplicateForm(e: React.MouseEvent, form: StratForm) {
    e.stopPropagation()
    setDuplicating(form.id)
    const newId = genId()
    await supabase.from('strat_forms').insert({
      id: newId, title: `${form.title} (Copy)`,
      description: form.description, ai_instructions: form.ai_instructions,
      fields: form.fields, published: false,
      ai_enabled: form.ai_enabled, redirect_url: form.redirect_url || '',
    })
    await loadForms()
    setDuplicating(null)
    showToast('Form duplicated')
  }

  async function deleteForm(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    if (!confirm('Delete this form and all its responses?')) return
    await supabase.from('strat_responses').delete().eq('form_id', id)
    await supabase.from('strat_forms').delete().eq('id', id)
    setForms(f => f.filter(x => x.id !== id))
    showToast('Form deleted')
  }

  function copyLink(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    navigator.clipboard.writeText(`${window.location.origin}/f/${id}`)
    showToast('Share link copied')
  }

  const published = forms.filter(f => f.published).length
  const totalResps = Object.values(respCounts).reduce((a, b) => a + b, 0)

  return (
    <div className="app">
      <Topbar right={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* API key warning dot */}
          {!hasApiKey && (
            <button
              className="btn btn-sm"
              onClick={() => setShowSettings(true)}
              style={{ borderColor: 'rgba(192,57,43,0.3)', color: 'var(--danger)', fontSize: 12 }}
              title="Gemini API key not configured"
            >
              <span style={{ fontSize: 10 }}>⚠</span> Set API Key
            </button>
          )}
          <button
            className="btn btn-sm"
            onClick={() => setShowSettings(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            title="Settings"
          >
            <IconSettings />
            Settings
          </button>
          <button className="btn btn-primary btn-sm" onClick={createNew}>
            <IconPlus /> New Form
          </button>
        </div>
      } />

      <div className="main">
        <div className="fade-up">
          <div className="section-head" style={{ marginBottom: 20 }}>
            <div>
              <div className="eyebrow">Form Intelligence</div>
              <h1 className="section-title">My Forms</h1>
              <p className="section-sub">Build, publish and track AI-powered forms</p>
            </div>
          </div>

          {/* Stats */}
          <div className="stats-row fade-up-1">
            <div className="stat-cell">
              <div className="stat-label">Total Forms</div>
              <div className="stat-value">{forms.length}</div>
            </div>
            <div className="stat-cell">
              <div className="stat-label">Live</div>
              <div className="stat-value" style={{ color: 'var(--success)' }}>{published}</div>
            </div>
            <div className="stat-cell">
              <div className="stat-label">Responses</div>
              <div className="stat-value" style={{ color: 'var(--orange)' }}>{totalResps}</div>
            </div>
            <div
              className="stat-cell"
              style={{ cursor: 'pointer', borderColor: hasApiKey ? 'var(--border)' : 'rgba(232,97,42,0.3)' }}
              onClick={() => setShowSettings(true)}
              title="Click to manage API key"
            >
              <div className="stat-label">AI Engine</div>
              <div className="stat-value" style={{ fontSize: 14, paddingTop: 4, color: hasApiKey ? 'var(--orange)' : 'var(--text3)' }}>
                {hasApiKey ? '✓ Active' : '⚠ No Key'}
              </div>
            </div>
          </div>

          {/* Forms */}
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1,2,3].map(i => (
                <div key={i} style={{
                  height: 120, borderRadius: 'var(--r2)',
                  background: 'linear-gradient(90deg, var(--off-white) 25%, var(--light) 50%, var(--off-white) 75%)',
                  backgroundSize: '400px 100%',
                  animation: 'shimmer 1.4s ease infinite',
                  border: '1px solid var(--border)'
                }} />
              ))}
            </div>
          ) : forms.length === 0 ? (
            <div className="empty fade-up-2">
              <div className="empty-icon">◈</div>
              <p style={{ fontSize: 13, marginBottom: 20, fontFamily: 'var(--font-head)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>No forms yet</p>
              <button className="btn btn-primary" onClick={createNew}><IconPlus /> Create your first form</button>
            </div>
          ) : (
            <div className="forms-grid fade-up-2">
              {forms.map(f => (
                <div key={f.id} className="card card-hover"
                  style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
                  onClick={() => navigate(`/builder/${f.id}`)}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ fontFamily: 'var(--font-head)', fontSize: 14, fontWeight: 700, lineHeight: 1.3, textTransform: 'uppercase', letterSpacing: '0.02em', flex: 1 }}>
                      {f.title || 'Untitled Form'}
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0, alignItems: 'center' }}>
                      {(f as any).ai_enabled !== false && (
                        <span className="badge badge-ai" style={{ fontSize: 10 }}><IconSparkle /></span>
                      )}
                      <span className={`badge ${f.published ? 'badge-live' : 'badge-draft'}`}>
                        {f.published ? 'Live' : 'Draft'}
                      </span>
                    </div>
                  </div>

                  {f.description && (
                    <p style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.55 }}>
                      {f.description.slice(0, 90)}{f.description.length > 90 ? '…' : ''}
                    </p>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>
                    <span>{f.fields?.length ?? 0} fields</span>
                    <span style={{ color: 'var(--border2)' }}>◆</span>
                    <span>{respCounts[f.id] ?? 0} responses</span>
                    <span style={{ color: 'var(--border2)' }}>◆</span>
                    <span>{formatDate(f.created_at)}</span>
                  </div>

                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--border)' }}
                    onClick={e => e.stopPropagation()}
                  >
                    <button className="btn-icon" title="Edit" onClick={() => navigate(`/builder/${f.id}`)}><IconEdit /></button>
                    {f.published && <>
                      <button className="btn-icon" title="Copy link" onClick={e => copyLink(e, f.id)}><IconLink /></button>
                      <button className="btn-icon" title="Preview" onClick={() => window.open(`/f/${f.id}`, '_blank')}><IconEye /></button>
                    </>}
                    <button className="btn-icon" title="Responses" onClick={() => navigate(`/responses/${f.id}`)}><IconResponses /></button>
                    <button
                      className="btn-icon" title="Duplicate"
                      onClick={e => duplicateForm(e, f)}
                      disabled={duplicating === f.id}
                      style={{ opacity: duplicating === f.id ? 0.5 : 1 }}
                    ><IconCopy /></button>
                    <div style={{ marginLeft: 'auto' }}>
                      <button
                        className="btn-icon"
                        style={{ color: 'var(--danger)', borderColor: 'rgba(192,57,43,0.2)' }}
                        onClick={e => deleteForm(e, f.id)}
                      ><IconTrash /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ marginTop: 48, paddingTop: 20, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-head)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            StratIntel · stratai.io
          </span>
          <button
            className="btn-icon"
            onClick={() => setShowSettings(true)}
            title="Settings"
            style={{ color: 'var(--text3)' }}
          >
            <IconSettings />
          </button>
        </div>
      </div>

      {/* Settings Drawer */}
      {showSettings && <SettingsDrawer onClose={() => setShowSettings(false)} />}

      <style>{`
        @keyframes shimmer {
          0% { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
      `}</style>
    </div>
  )
}
