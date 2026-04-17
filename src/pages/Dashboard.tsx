import React, { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, StratForm } from '../lib/supabase'
import { genId, showToast, formatDate } from '../lib/utils'
import {
  AIProvider,
  getProvider, setProvider,
  getGeminiApiKey, setGeminiApiKey, clearGeminiApiKey, testGeminiKey, GEMINI_KEY_STORAGE,
  getOpenAIApiKey, setOpenAIApiKey, clearOpenAIApiKey, testOpenAIKey, OPENAI_KEY_STORAGE,
  getOpenAIModel, setOpenAIModel, OPENAI_MODELS,
} from '../lib/ai'
import Topbar from '../components/Topbar'
import {
  IconPlus, IconTrash, IconLink, IconEye, IconEdit,
  IconResponses, IconCopy, IconSettings, IconKey, IconX, IconShield, IconCheck, IconSparkle
} from '../components/Icons'

// ── Settings Drawer ──────────────────────────────────────────────────────────
function SettingsDrawer({ onClose }: { onClose: () => void }) {
  const [provider, setProviderState] = useState<AIProvider>(getProvider())

  // Gemini state
  const [geminiKey, setGeminiKeyState] = useState(getGeminiApiKey())
  const [showGeminiKey, setShowGeminiKey] = useState(false)
  const [geminiTesting, setGeminiTesting] = useState(false)
  const [geminiResult, setGeminiResult] = useState<{ ok: boolean; model?: string; error?: string } | null>(null)

  // OpenAI state
  const [openaiKey, setOpenaiKeyState] = useState(getOpenAIApiKey())
  const [openaiModel, setOpenaiModelState] = useState(getOpenAIModel())
  const [showOpenaiKey, setShowOpenaiKey] = useState(false)
  const [openaiTesting, setOpenaiTesting] = useState(false)
  const [openaiResult, setOpenaiResult] = useState<{ ok: boolean; model?: string; error?: string } | null>(null)

  function switchProvider(p: AIProvider) {
    setProvider(p)
    setProviderState(p)
    showToast(`Switched to ${p === 'gemini' ? 'Google Gemini' : 'OpenAI'}`)
  }

  // ── Gemini actions ──
  async function testGemini() {
    setGeminiTesting(true); setGeminiResult(null)
    const r = await testGeminiKey(geminiKey.trim())
    setGeminiResult(r); setGeminiTesting(false)
  }
  function saveGemini() {
    setGeminiApiKey(geminiKey); setGeminiResult(null)
    showToast('Gemini API key saved')
  }

  // ── OpenAI actions ──
  async function testOpenAI() {
    setOpenaiTesting(true); setOpenaiResult(null)
    const r = await testOpenAIKey(openaiKey.trim(), openaiModel)
    setOpenaiResult(r); setOpenaiTesting(false)
  }
  function saveOpenAI() {
    setOpenAIApiKey(openaiKey)
    setOpenAIModel(openaiModel)
    setOpenaiResult(null)
    showToast('OpenAI settings saved')
  }

  const activeKey = provider === 'gemini' ? getGeminiApiKey() : getOpenAIApiKey()

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer">
        {/* Header */}
        <div className="drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconSettings />
            <span className="drawer-title">Settings</span>
          </div>
          <button className="btn-icon" onClick={onClose}><IconX /></button>
        </div>

        <div className="drawer-body">

          {/* ── Provider selector ── */}
          <div className="drawer-section">
            <div className="drawer-section-title">AI Provider</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {([
                { id: 'gemini' as AIProvider, label: 'Google Gemini', sub: 'gemini-2.0-flash', logo: '◈' },
                { id: 'openai' as AIProvider, label: 'OpenAI',        sub: 'GPT-4o / GPT-4o Mini', logo: '⬡' },
              ]).map(p => {
                const isActive = provider === p.id
                const hasKey = p.id === 'gemini' ? !!getGeminiApiKey() : !!getOpenAIApiKey()
                return (
                  <div
                    key={p.id}
                    onClick={() => switchProvider(p.id)}
                    style={{
                      padding: '12px 14px', borderRadius: 'var(--r2)', cursor: 'pointer',
                      border: isActive ? '2px solid var(--orange)' : '1px solid var(--border)',
                      background: isActive ? 'var(--orange-lt)' : 'var(--off-white)',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 18, color: isActive ? 'var(--orange)' : 'var(--text3)' }}>{p.logo}</span>
                      {isActive && (
                        <span style={{
                          fontSize: 9, fontFamily: 'var(--font-head)', fontWeight: 700,
                          textTransform: 'uppercase', letterSpacing: '0.5px',
                          background: 'var(--orange)', color: 'white',
                          padding: '2px 6px', borderRadius: 3,
                        }}>Active</span>
                      )}
                      {!isActive && hasKey && (
                        <span style={{ fontSize: 9, color: 'var(--success)' }}>✓ Key set</span>
                      )}
                    </div>
                    <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.03em', color: isActive ? 'var(--orange)' : 'var(--text)' }}>
                      {p.label}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                      {p.sub}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Gemini Section ── */}
          <div className="drawer-section">
            <div className="drawer-section-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>Google Gemini</span>
              {provider === 'gemini' && (
                <span style={{ fontSize: 9, fontFamily: 'var(--font-head)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', background: 'var(--orange)', color: 'white', padding: '1px 5px', borderRadius: 2 }}>
                  Active
                </span>
              )}
            </div>

            {/* Status */}
            <div className={`key-status ${geminiKey ? (geminiResult ? (geminiResult.ok ? 'ok' : 'error') : 'ok') : 'error'}`}>
              {geminiKey
                ? geminiResult
                  ? geminiResult.ok
                    ? <><IconCheck /> Connected · <code style={{ fontSize: 10 }}>{geminiResult.model}</code></>
                    : <><span>⚠</span> {geminiResult.error}</>
                  : <><IconShield /> Key configured</>
                : <><span>⚠</span> No key set</>
              }
            </div>

            <div className="field-group">
              <label className="field-label"><span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><IconKey /> API Key</span></label>
              <div className="key-input-wrap">
                <input className="field-input" type={showGeminiKey ? 'text' : 'password'}
                  value={geminiKey} placeholder="AIza••••••••••••••••••••••••"
                  onChange={e => { setGeminiKeyState(e.target.value); setGeminiResult(null) }}
                  onKeyDown={e => e.key === 'Enter' && testGemini()}
                  autoComplete="off" spellCheck={false}
                />
                <button className="key-toggle-btn" onClick={() => setShowGeminiKey(v => !v)} type="button">
                  {showGeminiKey ? 'Hide' : 'Show'}
                </button>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 5, lineHeight: 1.6 }}>
                Free key from{' '}
                <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" style={{ color: 'var(--orange)' }}>
                  aistudio.google.com/apikey
                </a>
              </p>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-primary btn-sm" onClick={saveGemini} disabled={!geminiKey.trim()}>Save Key</button>
              <button className="btn btn-sm" onClick={testGemini} disabled={geminiTesting || !geminiKey.trim()}>
                {geminiTesting ? <><div className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> Testing…</> : <><IconSparkle /> Test</>}
              </button>
              {localStorage.getItem(GEMINI_KEY_STORAGE) && (
                <button className="btn btn-sm btn-danger" onClick={() => { clearGeminiApiKey(); setGeminiKeyState(''); setGeminiResult(null) }}>Clear</button>
              )}
            </div>

            {geminiResult && (
              <div style={{ marginTop: 10, padding: '10px 13px', borderRadius: 'var(--r)', fontSize: 12, lineHeight: 1.65,
                background: geminiResult.ok ? '#e8f5ee' : 'rgba(192,57,43,0.05)',
                border: `1px solid ${geminiResult.ok ? '#b6ddc8' : 'rgba(192,57,43,0.2)'}`,
                color: geminiResult.ok ? 'var(--success)' : 'var(--danger)',
              }}>
                {geminiResult.ok
                  ? <>✓ Connected · model: <strong>{geminiResult.model}</strong></>
                  : <>{geminiResult.error}
                    <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer"
                      style={{ display: 'block', marginTop: 5, color: 'var(--orange)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                      → aistudio.google.com/apikey
                    </a>
                  </>
                }
              </div>
            )}
          </div>

          {/* ── OpenAI Section ── */}
          <div className="drawer-section">
            <div className="drawer-section-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>OpenAI</span>
              {provider === 'openai' && (
                <span style={{ fontSize: 9, fontFamily: 'var(--font-head)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', background: 'var(--orange)', color: 'white', padding: '1px 5px', borderRadius: 2 }}>
                  Active
                </span>
              )}
            </div>

            {/* Status */}
            <div className={`key-status ${openaiKey ? (openaiResult ? (openaiResult.ok ? 'ok' : 'error') : 'ok') : 'error'}`}>
              {openaiKey
                ? openaiResult
                  ? openaiResult.ok
                    ? <><IconCheck /> Connected · <code style={{ fontSize: 10 }}>{openaiResult.model}</code></>
                    : <><span>⚠</span> {openaiResult.error}</>
                  : <><IconShield /> Key configured</>
                : <><span>⚠</span> No key set</>
              }
            </div>

            <div className="field-group">
              <label className="field-label"><span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><IconKey /> API Key</span></label>
              <div className="key-input-wrap">
                <input className="field-input" type={showOpenaiKey ? 'text' : 'password'}
                  value={openaiKey} placeholder="sk-••••••••••••••••••••••••••••"
                  onChange={e => { setOpenaiKeyState(e.target.value); setOpenaiResult(null) }}
                  onKeyDown={e => e.key === 'Enter' && testOpenAI()}
                  autoComplete="off" spellCheck={false}
                />
                <button className="key-toggle-btn" onClick={() => setShowOpenaiKey(v => !v)} type="button">
                  {showOpenaiKey ? 'Hide' : 'Show'}
                </button>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 5, lineHeight: 1.6 }}>
                Get key from{' '}
                <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" style={{ color: 'var(--orange)' }}>
                  platform.openai.com/api-keys
                </a>
              </p>
            </div>

            <div className="field-group">
              <label className="field-label">Model</label>
              <select className="field-input" value={openaiModel} onChange={e => setOpenaiModelState(e.target.value)}>
                {OPENAI_MODELS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-primary btn-sm" onClick={saveOpenAI} disabled={!openaiKey.trim()}>Save</button>
              <button className="btn btn-sm" onClick={testOpenAI} disabled={openaiTesting || !openaiKey.trim()}>
                {openaiTesting ? <><div className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> Testing…</> : <><IconSparkle /> Test</>}
              </button>
              {localStorage.getItem(OPENAI_KEY_STORAGE) && (
                <button className="btn btn-sm btn-danger" onClick={() => { clearOpenAIApiKey(); setOpenaiKeyState(''); setOpenaiResult(null) }}>Clear</button>
              )}
            </div>

            {openaiResult && (
              <div style={{ marginTop: 10, padding: '10px 13px', borderRadius: 'var(--r)', fontSize: 12, lineHeight: 1.65,
                background: openaiResult.ok ? '#e8f5ee' : 'rgba(192,57,43,0.05)',
                border: `1px solid ${openaiResult.ok ? '#b6ddc8' : 'rgba(192,57,43,0.2)'}`,
                color: openaiResult.ok ? 'var(--success)' : 'var(--danger)',
              }}>
                {openaiResult.ok
                  ? <>✓ Connected · model: <strong>{openaiResult.model}</strong></>
                  : <>{openaiResult.error}
                    <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer"
                      style={{ display: 'block', marginTop: 5, color: 'var(--orange)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                      → platform.openai.com/api-keys
                    </a>
                  </>
                }
              </div>
            )}
          </div>

          {/* ── Quick links ── */}
          <div className="drawer-section">
            <div className="drawer-section-title">Quick Links</div>
            {[
              ['Gemini API Key', 'https://aistudio.google.com/apikey', 'aistudio.google.com'],
              ['OpenAI API Key', 'https://platform.openai.com/api-keys', 'platform.openai.com'],
              ['OpenAI Usage & Billing', 'https://platform.openai.com/usage', 'platform.openai.com/usage'],
              ['GitHub Repo', 'https://github.com/Strataiio/stratintel', 'Strataiio/stratintel'],
            ].map(([label, url, hint]) => (
              <a key={url} href={url} target="_blank" rel="noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '9px 12px', borderRadius: 'var(--r)',
                  border: '1px solid var(--border)', marginBottom: 7,
                  textDecoration: 'none', background: 'var(--off-white)',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--orange)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{label}</div>
                  <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{hint}</div>
                </div>
                <span style={{ fontSize: 13, color: 'var(--text3)' }}>↗</span>
              </a>
            ))}
          </div>

          <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)', textAlign: 'center', paddingTop: 4 }}>
            StratIntel v1.0 · stratai.io
          </div>
        </div>

        <div className="drawer-footer">
          <button className="btn" style={{ width: '100%' }} onClick={onClose}>Done</button>
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

  const provider = getProvider()
  const hasApiKey = provider === 'gemini' ? !!getGeminiApiKey() : !!getOpenAIApiKey()
  const providerLabel = provider === 'gemini' ? 'Gemini' : 'OpenAI'

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
      ai_enabled: (form as any).ai_enabled, redirect_url: (form as any).redirect_url || '',
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
          {!hasApiKey && (
            <button className="btn btn-sm" onClick={() => setShowSettings(true)}
              style={{ borderColor: 'rgba(192,57,43,0.3)', color: 'var(--danger)', fontSize: 12 }}>
              <span style={{ fontSize: 10 }}>⚠</span> Set API Key
            </button>
          )}
          <button className="btn btn-sm" onClick={() => setShowSettings(true)}>
            <IconSettings /> Settings
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
            <div className="stat-cell" style={{ cursor: 'pointer', borderColor: hasApiKey ? 'var(--border)' : 'rgba(232,97,42,0.3)' }}
              onClick={() => setShowSettings(true)} title="Click to manage AI settings">
              <div className="stat-label">AI Provider</div>
              <div className="stat-value" style={{ fontSize: 13, paddingTop: 4, color: hasApiKey ? 'var(--orange)' : 'var(--text3)' }}>
                {hasApiKey ? `✓ ${providerLabel}` : '⚠ No Key'}
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

                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--border)' }}
                    onClick={e => e.stopPropagation()}>
                    <button className="btn-icon" title="Edit" onClick={() => navigate(`/builder/${f.id}`)}><IconEdit /></button>
                    {f.published && <>
                      <button className="btn-icon" title="Copy link" onClick={e => copyLink(e, f.id)}><IconLink /></button>
                      <button className="btn-icon" title="Preview" onClick={() => window.open(`/f/${f.id}`, '_blank')}><IconEye /></button>
                    </>}
                    <button className="btn-icon" title="Responses" onClick={() => navigate(`/responses/${f.id}`)}><IconResponses /></button>
                    <button className="btn-icon" title="Duplicate" disabled={duplicating === f.id}
                      onClick={e => duplicateForm(e, f)} style={{ opacity: duplicating === f.id ? 0.5 : 1 }}>
                      <IconCopy />
                    </button>
                    <div style={{ marginLeft: 'auto' }}>
                      <button className="btn-icon" style={{ color: 'var(--danger)', borderColor: 'rgba(192,57,43,0.2)' }}
                        onClick={e => deleteForm(e, f.id)}><IconTrash /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginTop: 48, paddingTop: 20, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-head)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            StratIntel · stratai.io
          </span>
          <button className="btn-icon" onClick={() => setShowSettings(true)} title="Settings" style={{ color: 'var(--text3)' }}>
            <IconSettings />
          </button>
        </div>
      </div>

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
