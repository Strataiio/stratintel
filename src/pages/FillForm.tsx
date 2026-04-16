import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase, StratForm, FormField } from '../lib/supabase'
import { analyzeWithGemini } from '../lib/gemini'
import { downloadText } from '../lib/utils'
import Topbar from '../components/Topbar'
import { IconSparkle, IconDownload, IconArrow } from '../components/Icons'

export default function FillForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [form, setForm] = useState<StratForm | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [fillData, setFillData] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [responseId, setResponseId] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => { if (id) loadForm(id) }, [id])

  async function loadForm(fid: string) {
    const { data } = await supabase.from('strat_forms').select('*').eq('id', fid).eq('published', true).single()
    if (!data) { setNotFound(true); return }
    setForm(data)
  }

  function updateField(fieldId: string, value: string) {
    setFillData(d => ({ ...d, [fieldId]: value }))
    if (errors[fieldId]) setErrors(e => { const n = { ...e }; delete n[fieldId]; return n })
  }

  async function handleSubmit() {
    if (!form) return
    const newErrors: Record<string, string> = {}
    form.fields.forEach(f => {
      if (f.required && !fillData[f.id]?.trim()) newErrors[f.id] = 'This field is required'
    })
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return }
    setAnalyzing(true)
    setSubmitError('')
    try {
      const fields = form.fields.map(f => ({ label: f.label || f.type, value: fillData[f.id] || '' }))
      const report = await analyzeWithGemini(form.title, fields, form.ai_instructions)
      const respondentEmail = fillData[form.fields.find(f => f.type === 'email')?.id || ''] || ''
      const { data: saved } = await supabase.from('strat_responses').insert({
        form_id: form.id, form_title: form.title,
        response_data: fillData, ai_report: report,
        respondent_email: respondentEmail
      }).select('id').single()
      if (saved) setResponseId(saved.id)
      setResult(report)
    } catch (e) {
      setSubmitError('Analysis failed. Please try again.')
    }
    setAnalyzing(false)
  }

  const pct = form ? Math.min(100, Math.round(Object.keys(fillData).filter(k => fillData[k]).length / Math.max(form.fields.length, 1) * 100)) : 0

  if (notFound) return (
    <div className="app">
      <Topbar />
      <div className="main">
        <div className="form-view" style={{ textAlign: 'center', paddingTop: 60 }}>
          <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.3 }}>⬡</div>
          <h2 style={{ fontFamily: 'var(--font-head)', marginBottom: 8 }}>Form not found</h2>
          <p style={{ color: 'var(--text2)', marginBottom: 20 }}>This form may not exist or is not published.</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>Go home</button>
        </div>
      </div>
    </div>
  )

  if (!form) return (
    <div className="app"><Topbar />
      <div className="main" style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text3)' }}>
        <div className="spinner" /> Loading form…
      </div>
    </div>
  )

  if (result) return (
    <div className="app">
      <Topbar right={<span className="badge badge-ai"><IconSparkle /> AI Analysis</span>} />
      <div className="main">
        <div className="form-view fade-up">
          <div style={{ textAlign: 'center', padding: '20px 0 32px' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>✦</div>
            <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Analysis Complete</h2>
            <p style={{ color: 'var(--text2)', fontSize: 14 }}>Here's your personalised brief from Gemini AI</p>
          </div>
          <div className="result-card">
            <div className="result-header">
              <span className="badge badge-ai"><IconSparkle /> Gemini AI Analysis</span>
              <span style={{ fontSize: 12, color: 'var(--text3)', marginLeft: 'auto' }}>{form.title}</span>
            </div>
            <div className="result-content">{result}</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <button className="btn" onClick={() => downloadText(
              `StratIntel AI Analysis Report\n${'='.repeat(42)}\nForm: ${form.title}\nDate: ${new Date().toLocaleString()}\n\n${result}`,
              `stratintel-report-${Date.now()}.txt`
            )}><IconDownload /> Download Report</button>
            <button className="btn btn-ghost" onClick={() => { setResult(null); setFillData({}); setResponseId(null) }}>Fill Again</button>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="app">
      <Topbar right={<span className="badge badge-ai"><IconSparkle /> AI-Powered</span>} />
      <div className="main">
        <div className="form-view fade-up">
          <div className="progress-bar"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
          <div className="form-view-header">
            <h1 className="form-view-title">{form.title}</h1>
            {form.description && <p className="form-view-desc">{form.description}</p>}
          </div>
          {form.fields.map(f => <FieldRenderer key={f.id} field={f} value={fillData[f.id] || ''} error={errors[f.id]} onChange={v => updateField(f.id, v)} />)}
          {submitError && <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>{submitError}</p>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={analyzing} style={{ minWidth: 160 }}>
              {analyzing ? <><div className="spinner" /> Analyzing…</> : <><IconSparkle /> Submit & Analyse</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function FieldRenderer({ field, value, error, onChange }: { field: FormField; value: string; error?: string; onChange: (v: string) => void }) {
  const typeMap: Record<string, string> = { email: 'email', phone: 'tel', url: 'url', company: 'text', text: 'text' }
  return (
    <div className="field-group" style={{ marginBottom: 22 }}>
      <label className="field-label">
        {field.label || 'Field'}
        {field.required && <span className="req"> *</span>}
      </label>
      {field.type === 'textarea' ? (
        <textarea className="field-input" value={value} placeholder={field.placeholder} onChange={e => onChange(e.target.value)} />
      ) : field.type === 'choice' ? (
        <div>{(field.choices || []).map(c => (
          <div key={c} className={`choice-option ${value === c ? 'selected' : ''}`} onClick={() => onChange(c)}>
            <input type="radio" name={`field-${field.id}`} checked={value === c} onChange={() => onChange(c)} style={{ accentColor: 'var(--accent)' }} />
            {c}
          </div>
        ))}</div>
      ) : (
        <input className="field-input" type={typeMap[field.type] || 'text'} value={value} placeholder={field.placeholder} onChange={e => onChange(e.target.value)} />
      )}
      {error && <div className="inline-err">{error}</div>}
    </div>
  )
}
