import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase, StratForm, FormField, FieldType } from '../lib/supabase'
import { genId, showToast } from '../lib/utils'
import Topbar from '../components/Topbar'
import { IconPlus, IconTrash, IconArrow, IconBack, IconCheck, IconSparkle, IconEye } from '../components/Icons'

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Short Text' },
  { value: 'textarea', label: 'Long Text' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'url', label: 'Website URL' },
  { value: 'company', label: 'Company Name' },
  { value: 'choice', label: 'Multiple Choice' },
]

function newField(): FormField {
  return { id: genId(), type: 'text', label: '', placeholder: '', required: false, choices: [] }
}

export default function Builder() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [form, setForm] = useState<StratForm | null>(null)
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [newFieldType, setNewFieldType] = useState<FieldType>('text')

  useEffect(() => { if (id) loadForm(id) }, [id])

  async function loadForm(fid: string) {
    const { data } = await supabase.from('strat_forms').select('*').eq('id', fid).single()
    if (data) {
      // Default ai_enabled to true for existing forms that don't have the field
      setForm({ ai_enabled: true, redirect_url: '', ...data })
    }
  }

  const save = useCallback(async (updates: Partial<StratForm>) => {
    if (!form) return
    setSaving(true)
    const updated = { ...form, ...updates }
    setForm(updated)
    await supabase.from('strat_forms').update(updates).eq('id', form.id)
    setSaving(false)
  }, [form])

  function updateField(fieldId: string, key: keyof FormField, value: unknown) {
    if (!form) return
    save({ fields: form.fields.map(f => f.id === fieldId ? { ...f, [key]: value } : f) })
  }

  function addField() {
    if (!form) return
    const f = newField(); f.type = newFieldType
    save({ fields: [...form.fields, f] })
  }

  function removeField(fieldId: string) {
    if (!form) return
    save({ fields: form.fields.filter(f => f.id !== fieldId) })
  }

  function addChoice(fieldId: string, choice: string) {
    if (!form || !choice.trim()) return
    save({ fields: form.fields.map(f => f.id === fieldId ? { ...f, choices: [...(f.choices || []), choice.trim()] } : f) })
  }

  function removeChoice(fieldId: string, choice: string) {
    if (!form) return
    save({ fields: form.fields.map(f => f.id === fieldId ? { ...f, choices: f.choices.filter(c => c !== choice) } : f) })
  }

  async function publishForm() {
    if (!form || form.fields.length === 0) { showToast('Add at least one field first'); return }
    await save({ published: true })
    showToast('Form is now live!')
    setStep(4)
  }

  async function unpublishForm() {
    await save({ published: false })
    showToast('Form unpublished')
  }

  function copyLink() {
    navigator.clipboard.writeText(`${window.location.origin}/f/${form?.id}`)
    showToast('Link copied')
  }

  if (!form) return (
    <div className="app"><Topbar />
      <div className="main" style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text3)' }}>
        <div className="spinner" /> Loading…
      </div>
    </div>
  )

  const shareUrl = `${window.location.origin}/f/${form.id}`
  const STEPS = [{n:1,l:'Details'},{n:2,l:'Fields'},{n:3,l:'AI Setup'},{n:4,l:'Publish'}]
  const aiEnabled = form.ai_enabled !== false // default true

  return (
    <div className="app">
      <Topbar right={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {saving && <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>saving…</span>}
          <span className={`badge ${form.published ? 'badge-live' : 'badge-draft'}`}>{form.published ? 'Live' : 'Draft'}</span>
        </div>
      } />
      <div className="main">
        <div style={{ maxWidth: 700, margin: '0 auto' }} className="fade-up">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}><IconBack /> Dashboard</button>
            <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>
              {form.title || 'untitled-form'}
            </span>
          </div>

          {/* Step bar */}
          <div className="step-bar">
            {STEPS.map((s, i) => (
              <React.Fragment key={s.n}>
                <div className={`step ${step===s.n?'active':step>s.n?'done':''}`} onClick={() => setStep(s.n)}>
                  <div className="step-num">{step > s.n ? <IconCheck /> : s.n}</div>
                  <span>{s.l}</span>
                </div>
                {i < STEPS.length - 1 && <div className="step-line" />}
              </React.Fragment>
            ))}
          </div>

          {/* ── Step 1: Details ── */}
          {step === 1 && (
            <div className="fade-up">
              <div className="card" style={{ marginBottom: 16 }}>
                <div className="eyebrow" style={{ marginBottom: 16 }}>Form Details</div>
                <div className="field-group">
                  <label className="field-label">Form Title <span className="req">*</span></label>
                  <input className="field-input" defaultValue={form.title}
                    placeholder="e.g. MARKETING STRATEGY INQUIRY"
                    onBlur={e => save({ title: e.target.value })}
                    onChange={e => setForm(f => f ? { ...f, title: e.target.value } : f)} />
                </div>
                <div className="field-group" style={{ marginBottom: 0 }}>
                  <label className="field-label">Description</label>
                  <textarea className="field-input" defaultValue={form.description}
                    placeholder="Brief description visible to respondents…"
                    onBlur={e => save({ description: e.target.value })}
                    onChange={e => setForm(f => f ? { ...f, description: e.target.value } : f)} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" onClick={() => setStep(2)}>Build Fields <IconArrow /></button>
              </div>
            </div>
          )}

          {/* ── Step 2: Fields ── */}
          {step === 2 && (
            <div className="fade-up">
              <div className="card" style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div className="eyebrow">{form.fields.length} Fields</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <select className="field-input" style={{ width: 'auto', padding: '6px 10px', fontSize: 12 }}
                      value={newFieldType} onChange={e => setNewFieldType(e.target.value as FieldType)}>
                      {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    <button className="btn btn-primary btn-sm" onClick={addField}><IconPlus /> Add</button>
                  </div>
                </div>
                {form.fields.length === 0 ? (
                  <div className="empty" style={{ padding: '28px 0' }}>
                    <div className="empty-icon">◈</div>
                    <p style={{ fontSize: 12, fontFamily: 'var(--font-head)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>No fields yet</p>
                  </div>
                ) : form.fields.map(f => (
                  <div key={f.id} className="field-item">
                    <div className="field-item-head">
                      <span className="drag-handle">⠿</span>
                      <span className="field-type-tag">{FIELD_TYPES.find(t => t.value === f.type)?.label}</span>
                      <span style={{ fontSize: 12, color: 'var(--text3)', flex: 1, fontFamily: 'var(--font-mono)' }}>{f.label || 'unlabeled'}</span>
                      <button className="btn-icon btn-danger" onClick={() => removeField(f.id)}><IconTrash /></button>
                    </div>
                    <div className="field-row">
                      <div className="field-group" style={{ margin: 0 }}>
                        <label className="field-label">Label</label>
                        <input className="field-input" defaultValue={f.label} placeholder="Field label"
                          onBlur={e => updateField(f.id, 'label', e.target.value)} />
                      </div>
                      <div className="field-group" style={{ margin: 0 }}>
                        <label className="field-label">Type</label>
                        <select className="field-input" value={f.type} onChange={e => updateField(f.id, 'type', e.target.value)}>
                          {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="field-row" style={{ marginTop: 8 }}>
                      <div className="field-group" style={{ margin: 0 }}>
                        <label className="field-label">Placeholder</label>
                        <input className="field-input" defaultValue={f.placeholder} placeholder="Hint text…"
                          onBlur={e => updateField(f.id, 'placeholder', e.target.value)} />
                      </div>
                      <div className="field-group" style={{ margin: 0, display: 'flex', alignItems: 'flex-end', paddingBottom: 2 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text2)' }}>
                          <input type="checkbox" checked={f.required} onChange={e => updateField(f.id, 'required', e.target.checked)} style={{ accentColor: 'var(--orange)' }} />
                          Required
                        </label>
                      </div>
                    </div>
                    {f.type === 'choice' && (
                      <div style={{ marginTop: 12 }}>
                        <label className="field-label">Choices</label>
                        <ChoiceEditor choices={f.choices||[]} onAdd={c => addChoice(f.id,c)} onRemove={c => removeChoice(f.id,c)} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button className="btn btn-ghost" onClick={() => setStep(1)}><IconBack /> Back</button>
                <button className="btn btn-primary" onClick={() => setStep(3)}>AI Setup <IconArrow /></button>
              </div>
            </div>
          )}

          {/* ── Step 3: AI ── */}
          {step === 3 && (
            <div className="fade-up">
              {/* ── AI TOGGLE ── */}
              <div className="card" style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div className="eyebrow" style={{ marginBottom: 4 }}>AI Engine</div>
                    <div style={{ fontSize: 13, color: 'var(--text2)' }}>
                      {aiEnabled
                        ? 'Gemini AI will analyse every submission and show results instantly.'
                        : 'AI is off — respondents will be redirected after submission.'}
                    </div>
                  </div>
                  {/* Toggle switch */}
                  <div
                    onClick={() => save({ ai_enabled: !aiEnabled })}
                    style={{
                      width: 48, height: 26, borderRadius: 13,
                      background: aiEnabled ? 'var(--orange)' : 'var(--border2)',
                      cursor: 'pointer', position: 'relative',
                      transition: 'background 0.2s', flexShrink: 0,
                      border: '1px solid ' + (aiEnabled ? 'var(--orange-dk)' : 'var(--border2)'),
                    }}
                    role="switch" aria-checked={aiEnabled}
                  >
                    <div style={{
                      position: 'absolute',
                      top: 3, left: aiEnabled ? 24 : 3,
                      width: 18, height: 18, borderRadius: '50%',
                      background: 'white',
                      transition: 'left 0.2s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    }} />
                  </div>
                </div>

                {/* AI status badge */}
                <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className={`badge ${aiEnabled ? 'badge-ai' : 'badge-draft'}`}>
                    {aiEnabled ? <><IconSparkle /> Gemini 1.5 Flash — ON</> : '○ AI Engine — OFF'}
                  </span>
                </div>
              </div>

              {/* ── AI INSTRUCTIONS (only when ON) ── */}
              {aiEnabled && (
                <div className="card" style={{ marginBottom: 14 }}>
                  <div className="field-group" style={{ marginBottom: 0 }}>
                    <label className="field-label">Analysis Instructions</label>
                    <textarea className="field-input" style={{ minHeight: 140 }}
                      defaultValue={form.ai_instructions}
                      placeholder="e.g. Act as a senior business consultant. Analyze the respondent's goals and budget. Suggest exactly 3 actionable growth strategies with a title, rationale, and first step each. Be specific, concise, and avoid generic advice."
                      onBlur={e => save({ ai_instructions: e.target.value })}
                      onChange={e => setForm(f => f ? { ...f, ai_instructions: e.target.value } : f)}
                    />
                    <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8, lineHeight: 1.7 }}>
                      This prompt guides Gemini AI for every submission. Specify role, output format, and tone.
                    </p>
                  </div>
                </div>
              )}

              {/* ── REDIRECT URL (only when OFF) ── */}
              {!aiEnabled && (
                <div className="card" style={{ marginBottom: 14, borderLeft: '3px solid var(--orange)' }}>
                  <div className="eyebrow" style={{ marginBottom: 12 }}>Redirect After Submission</div>
                  <div className="field-group" style={{ marginBottom: 0 }}>
                    <label className="field-label">Redirect URL <span className="req">*</span></label>
                    <input className="field-input"
                      defaultValue={form.redirect_url}
                      placeholder="https://yoursite.com/thank-you"
                      onBlur={e => save({ redirect_url: e.target.value })}
                      onChange={e => setForm(f => f ? { ...f, redirect_url: e.target.value } : f)}
                    />
                    <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8, lineHeight: 1.7 }}>
                      After submitting the form, respondents will be redirected to this URL. Make sure it starts with https://
                    </p>
                  </div>
                </div>
              )}

              {/* Tips card (only when AI is ON) */}
              {aiEnabled && (
                <div className="card" style={{ background: 'var(--off-white)', borderLeft: '3px solid var(--orange)', marginBottom: 14 }}>
                  <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.85 }}>
                    <strong style={{ fontFamily: 'var(--font-head)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text)' }}>Tips</strong><br />
                    • Role: <code>"Act as a marketing strategist…"</code><br />
                    • Output: <code>"Give exactly 3 bullet-point recommendations…"</code><br />
                    • Tone: <code>"Be concise, direct, avoid jargon…"</code>
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button className="btn btn-ghost" onClick={() => setStep(2)}><IconBack /> Back</button>
                <button className="btn btn-primary" onClick={() => setStep(4)}>Review & Publish <IconArrow /></button>
              </div>
            </div>
          )}

          {/* ── Step 4: Publish ── */}
          {step === 4 && (
            <div className="fade-up">
              <div className="card" style={{ marginBottom: 14 }}>
                <div className="eyebrow" style={{ marginBottom: 12 }}>Summary</div>
                <div style={{ fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: 4 }}>
                  {form.title || 'Untitled Form'}
                </div>
                {form.description && <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12 }}>{form.description}</p>}
                <div className="meta-grid">
                  <div className="meta-cell"><div className="meta-label">Fields</div><div className="meta-value">{form.fields.length}</div></div>
                  <div className="meta-cell"><div className="meta-label">Required</div><div className="meta-value">{form.fields.filter(f => f.required).length}</div></div>
                  <div className="meta-cell">
                    <div className="meta-label">AI Engine</div>
                    <div className="meta-value" style={{ fontSize: 13, paddingTop: 4, color: aiEnabled ? 'var(--orange)' : 'var(--text3)' }}>
                      {aiEnabled ? '✓ On' : '○ Off'}
                    </div>
                  </div>
                </div>
                {!aiEnabled && form.redirect_url && (
                  <div style={{ marginTop: 12, padding: '8px 12px', background: 'var(--off-white)', borderRadius: 'var(--r)', fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text2)' }}>
                    Redirect → {form.redirect_url}
                  </div>
                )}
              </div>

              {form.fields.length === 0 && (
                <div className="card" style={{ background: '#fef8e8', borderColor: '#e8d89a', borderLeft: '3px solid var(--amber)', marginBottom: 14 }}>
                  <p style={{ fontSize: 11, color: 'var(--amber)', fontFamily: 'var(--font-head)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    ⚠ Add at least one field before publishing
                  </p>
                </div>
              )}

              {!aiEnabled && !form.redirect_url && (
                <div className="card" style={{ background: '#fef8e8', borderColor: '#e8d89a', borderLeft: '3px solid var(--amber)', marginBottom: 14 }}>
                  <p style={{ fontSize: 11, color: 'var(--amber)', fontFamily: 'var(--font-head)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    ⚠ AI is off but no redirect URL is set. Add one in AI Setup.
                  </p>
                </div>
              )}

              {form.published && (
                <div className="card" style={{ background: '#e8f5ee', borderColor: '#b6ddc8', borderLeft: '3px solid var(--success)', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <span style={{ fontFamily: 'var(--font-head)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--success)' }}>
                      ✓ Form is Live
                    </span>
                  </div>
                  <div className="link-box">
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shareUrl}</span>
                    <button className="btn btn-sm" onClick={copyLink} style={{ flexShrink: 0 }}>Copy</button>
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <button className="btn btn-sm" onClick={() => window.open(`/f/${form.id}`, '_blank')}><IconEye /> Preview</button>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button className="btn btn-ghost" onClick={() => setStep(3)}><IconBack /> Back</button>
                <div style={{ display: 'flex', gap: 8 }}>
                  {form.published
                    ? <button className="btn btn-danger" onClick={unpublishForm}>Unpublish</button>
                    : <button className="btn btn-primary" disabled={form.fields.length === 0} onClick={publishForm}>
                        <IconSparkle /> Publish Form
                      </button>
                  }
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ChoiceEditor({ choices, onAdd, onRemove }: { choices: string[]; onAdd: (c: string) => void; onRemove: (c: string) => void }) {
  const [val, setVal] = useState('')
  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <input className="field-input" style={{ flex: 1 }} value={val} placeholder="Type a choice and press Enter…"
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key==='Enter'&&val.trim()) { onAdd(val); setVal('') }}} />
        <button className="btn btn-sm" onClick={() => { if(val.trim()){ onAdd(val); setVal('') } }}><IconPlus /></button>
      </div>
      <div>{choices.map(c => (
        <span key={c} style={{
          display:'inline-flex', alignItems:'center', gap:5,
          padding:'4px 10px', background:'var(--orange-lt)',
          border:'1px solid rgba(232,97,42,0.2)', borderRadius:'var(--r)',
          fontSize:12, margin:3, color:'var(--orange)', fontFamily:'var(--font-mono)'
        }}>
          {c}
          <button onClick={() => onRemove(c)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--orange-dk)', fontSize:14, padding:0, lineHeight:1 }}>×</button>
        </span>
      ))}</div>
    </div>
  )
}
