import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase, StratForm, FormField } from '../lib/supabase'
import { analyzeWithGemini } from '../lib/gemini'
import { downloadText } from '../lib/utils'
import Topbar from '../components/Topbar'
import { IconSparkle, IconDownload } from '../components/Icons'

export default function FillForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [form, setForm] = useState<StratForm | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [fillData, setFillData] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => { if (id) loadForm(id) }, [id])

  async function loadForm(fid: string) {
    const { data } = await supabase
      .from('strat_forms').select('*').eq('id', fid).eq('published', true).single()
    if (!data) { setNotFound(true); return }
    setForm({ ai_enabled: true, redirect_url: '', ...data })
  }

  function updateField(fieldId: string, value: string) {
    setFillData(d => ({ ...d, [fieldId]: value }))
    if (errors[fieldId]) setErrors(e => { const n = { ...e }; delete n[fieldId]; return n })
  }

  async function handleSubmit() {
    if (!form) return

    // Validate required fields
    const newErrors: Record<string, string> = {}
    form.fields.forEach(f => {
      if (f.required && !fillData[f.id]?.trim()) newErrors[f.id] = 'This field is required'
    })
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return }

    setSubmitting(true)
    setSubmitError('')

    const aiEnabled = form.ai_enabled !== false
    const respondentEmail = fillData[form.fields.find(f => f.type === 'email')?.id || ''] || ''

    try {
      if (aiEnabled) {
        // ── AI MODE: analyse then show result ──────────────────────────────
        const fields = form.fields.map(f => ({ label: f.label || f.type, value: fillData[f.id] || '' }))
        const report = await analyzeWithGemini(form.title, fields, form.ai_instructions)

        await supabase.from('strat_responses').insert({
          form_id: form.id, form_title: form.title,
          response_data: fillData, ai_report: report,
          respondent_email: respondentEmail
        })
        setResult(report)
      } else {
        // ── NO-AI MODE: save response then redirect ────────────────────────
        await supabase.from('strat_responses').insert({
          form_id: form.id, form_title: form.title,
          response_data: fillData, ai_report: '',
          respondent_email: respondentEmail
        })

        const redirectUrl = form.redirect_url?.trim()
        if (redirectUrl) {
          // Give a brief moment for the DB write before navigating
          setTimeout(() => { window.location.href = redirectUrl }, 400)
        } else {
          // Fallback: show simple thank-you if no redirect URL configured
          setResult('__no_ai__')
        }
      }
    } catch (err: any) {
      console.error('Submission error:', err)
      setSubmitError(err?.message || 'Something went wrong. Please try again.')
    }

    setSubmitting(false)
  }

  const filled = form ? Object.keys(fillData).filter(k => fillData[k]).length : 0
  const pct = form && form.fields.length > 0 ? Math.min(100, Math.round(filled / form.fields.length * 100)) : 0
  const aiEnabled = form ? form.ai_enabled !== false : true

  // ── NOT FOUND ────────────────────────────────────────────────────────────────
  if (notFound) return (
    <div className="app"><Topbar />
      <div className="main">
        <div className="form-view" style={{ textAlign:'center', paddingTop:60 }}>
          <div style={{ fontSize:36, marginBottom:16, opacity:0.2, fontFamily:'var(--font-head)' }}>◈</div>
          <h2 style={{ fontFamily:'var(--font-head)', fontSize:18, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>Form Not Found</h2>
          <p style={{ color:'var(--text2)', marginBottom:20, fontSize:13 }}>This form doesn't exist or isn't published.</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>Go Home</button>
        </div>
      </div>
    </div>
  )

  // ── LOADING ──────────────────────────────────────────────────────────────────
  if (!form) return (
    <div className="app"><Topbar />
      <div className="main" style={{ display:'flex', alignItems:'center', gap:10, color:'var(--text3)' }}>
        <div className="spinner" /> Loading form…
      </div>
    </div>
  )

  // ── AI RESULT ────────────────────────────────────────────────────────────────
  if (result && result !== '__no_ai__') return (
    <div className="app">
      <Topbar right={<span className="badge badge-ai"><IconSparkle /> Gemini AI</span>} />
      <div className="main">
        <div className="form-view fade-up">
          <div style={{ textAlign:'center', padding:'24px 0 32px' }}>
            <div style={{
              width:48, height:48, background:'var(--orange)', borderRadius:8,
              display:'flex', alignItems:'center', justifyContent:'center',
              margin:'0 auto 14px', fontSize:20, color:'white'
            }}>✦</div>
            <div className="eyebrow" style={{ marginBottom:6 }}>Analysis Complete</div>
            <h2 style={{ fontFamily:'var(--font-head)', fontSize:20, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.02em', marginBottom:6 }}>
              Your Intelligence Brief
            </h2>
            <p style={{ color:'var(--text2)', fontSize:13 }}>Generated by Gemini AI · {form.title}</p>
          </div>

          <div className="result-card">
            <div className="result-header">
              <span className="badge badge-ai"><IconSparkle /> Gemini AI Analysis</span>
              <span style={{ fontSize:11, color:'var(--text3)', marginLeft:'auto', fontFamily:'var(--font-mono)' }}>
                {new Date().toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
              </span>
            </div>
            <div className="result-content">{result}</div>
          </div>

          <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:16 }}>
            <button className="btn" onClick={() => downloadText(
              `STRATINTEL — AI ANALYSIS REPORT\n${'═'.repeat(42)}\nForm: ${form.title}\nDate: ${new Date().toLocaleString()}\n\n${result}`,
              `stratintel-${form.id.slice(0,6)}-${Date.now()}.txt`
            )}><IconDownload /> Download Report</button>
            <button className="btn btn-ghost" onClick={() => { setResult(null); setFillData({}) }}>
              Submit Again
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  // ── NO-AI THANK YOU (fallback when no redirect URL set) ──────────────────────
  if (result === '__no_ai__') return (
    <div className="app"><Topbar />
      <div className="main">
        <div className="form-view fade-up" style={{ textAlign:'center', paddingTop:60 }}>
          <div style={{
            width:56, height:56, background:'var(--orange)', borderRadius:10,
            display:'flex', alignItems:'center', justifyContent:'center',
            margin:'0 auto 18px', fontSize:24, color:'white'
          }}>✓</div>
          <div className="eyebrow" style={{ marginBottom:8 }}>Submitted</div>
          <h2 style={{ fontFamily:'var(--font-head)', fontSize:20, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.03em', marginBottom:10 }}>
            Thank You
          </h2>
          <p style={{ color:'var(--text2)', fontSize:14, lineHeight:1.65 }}>
            Your response has been recorded successfully.
          </p>
        </div>
      </div>
    </div>
  )

  // ── ANALYSING OVERLAY ────────────────────────────────────────────────────────
  if (submitting && aiEnabled) return (
    <div className="app"><Topbar />
      <div className="main">
        <div className="form-view" style={{ textAlign:'center', paddingTop:80 }}>
          <div style={{
            width:52, height:52, borderRadius:8,
            background:'var(--orange-lt)', border:'2px solid var(--orange)',
            display:'flex', alignItems:'center', justifyContent:'center',
            margin:'0 auto 20px', fontSize:22
          }}>✦</div>
          <div className="eyebrow" style={{ marginBottom:8 }}>Processing</div>
          <h2 style={{ fontFamily:'var(--font-head)', fontSize:18, textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:8 }}>
            Gemini is Analysing
          </h2>
          <p style={{ color:'var(--text2)', fontSize:13, marginBottom:24 }}>Building your intelligence brief…</p>
          <div className="spinner" style={{ width:24, height:24, borderWidth:3, margin:'0 auto' }} />
        </div>
      </div>
    </div>
  )

  // ── FILL FORM ────────────────────────────────────────────────────────────────
  return (
    <div className="app">
      <Topbar right={
        aiEnabled
          ? <span className="badge badge-ai"><IconSparkle /> AI-Powered</span>
          : <span className="badge badge-draft" style={{ fontSize:10 }}>Form</span>
      } />
      <div className="main">
        <div className="form-view fade-up">
          <div className="progress-bar"><div className="progress-fill" style={{ width:`${pct}%` }} /></div>

          <div className="form-view-header">
            <h1 className="form-view-title">{form.title}</h1>
            {form.description && <p className="form-view-desc">{form.description}</p>}
          </div>

          {form.fields.map(f => (
            <FieldRenderer
              key={f.id} field={f}
              value={fillData[f.id]||''}
              error={errors[f.id]}
              onChange={v => updateField(f.id, v)}
            />
          ))}

          {/* Error message */}
          {submitError && (
            <div style={{
              background: 'rgba(192,57,43,0.06)',
              border: '1px solid rgba(192,57,43,0.2)',
              borderLeft: '3px solid var(--danger)',
              borderRadius: 'var(--r)',
              padding: '12px 16px',
              marginBottom: 16,
            }}>
              <div style={{ fontSize:12, fontFamily:'var(--font-head)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', color:'var(--danger)', marginBottom:4 }}>
                Submission Error
              </div>
              <p style={{ color:'var(--danger)', fontSize:13, lineHeight:1.6 }}>{submitError}</p>
              {submitError.includes('API key') && (
                <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer"
                  style={{ fontSize:12, color:'var(--orange)', display:'block', marginTop:8, fontFamily:'var(--font-mono)' }}>
                  → Get a new API key at aistudio.google.com/apikey
                </a>
              )}
            </div>
          )}

          <div style={{ display:'flex', justifyContent:'flex-end', marginTop:28 }}>
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={submitting}
              style={{ minWidth:180 }}
            >
              {submitting
                ? <><div className="spinner" style={{ width:14, height:14, borderWidth:2 }} /> Submitting…</>
                : aiEnabled
                  ? <><IconSparkle /> Submit & Analyse</>
                  : '→ Submit'
              }
            </button>
          </div>

          {/* Footer */}
          <div style={{ marginTop:40, paddingTop:20, borderTop:'1px solid var(--border)', display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ width:18, height:18, background:'var(--orange)', borderRadius:3, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, color:'white', fontWeight:800, fontFamily:'var(--font-head)' }}>S</div>
            <span style={{ fontSize:11, color:'var(--text3)', fontFamily:'var(--font-head)', textTransform:'uppercase', letterSpacing:'0.5px' }}>
              Powered by StratIntel · stratai.io
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function FieldRenderer({ field, value, error, onChange }: {
  field: FormField; value: string; error?: string; onChange: (v: string) => void
}) {
  const typeMap: Record<string, string> = { email:'email', phone:'tel', url:'url', company:'text', text:'text' }
  return (
    <div className="field-group" style={{ marginBottom: 22 }}>
      <label className="field-label">
        {field.label || 'Field'}{field.required && <span className="req"> *</span>}
      </label>
      {field.type === 'textarea' ? (
        <textarea
          className="field-input" value={value}
          placeholder={field.placeholder}
          onChange={e => onChange(e.target.value)}
        />
      ) : field.type === 'choice' ? (
        <div>
          {(field.choices||[]).map(c => (
            <div key={c}
              className={`choice-option ${value===c?'selected':''}`}
              onClick={() => onChange(c)}
            >
              <input type="radio" name={`f-${field.id}`} checked={value===c}
                onChange={() => onChange(c)} style={{ accentColor:'var(--orange)' }} />
              {c}
            </div>
          ))}
        </div>
      ) : (
        <input
          className="field-input"
          type={typeMap[field.type]||'text'}
          value={value}
          placeholder={field.placeholder}
          onChange={e => onChange(e.target.value)}
        />
      )}
      {error && <div className="inline-err">{error}</div>}
    </div>
  )
}
