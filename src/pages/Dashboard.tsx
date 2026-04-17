import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, StratForm } from '../lib/supabase'
import { genId, showToast, formatDate } from '../lib/utils'
import Topbar from '../components/Topbar'
import { IconPlus, IconTrash, IconLink, IconEye, IconEdit, IconResponses, IconCopy } from '../components/Icons'

export default function Dashboard() {
  const navigate = useNavigate()
  const [forms, setForms] = useState<StratForm[]>([])
  const [loading, setLoading] = useState(true)
  const [respCounts, setRespCounts] = useState<Record<string, number>>({})
  const [duplicating, setDuplicating] = useState<string | null>(null)

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
      id, title: '', description: '', ai_instructions: '', fields: [], published: false
    })
    if (error) { showToast('Error: ' + error.message); return }
    navigate(`/builder/${id}`)
  }

  async function duplicateForm(e: React.MouseEvent, form: StratForm) {
    e.stopPropagation()
    setDuplicating(form.id)
    const newId = genId()
    const { error } = await supabase.from('strat_forms').insert({
      id: newId,
      title: `${form.title} (Copy)`,
      description: form.description,
      ai_instructions: form.ai_instructions,
      fields: form.fields,
      published: false,
    })
    if (error) { showToast('Duplicate failed'); setDuplicating(null); return }
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
    const newCounts = { ...respCounts }; delete newCounts[id]
    setRespCounts(newCounts)
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
        <button className="btn btn-primary btn-sm" onClick={createNew}>
          <IconPlus /> New Form
        </button>
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
          </div>

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
                    <span className={`badge ${f.published ? 'badge-live' : 'badge-draft'}`}>
                      {f.published ? 'Live' : 'Draft'}
                    </span>
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
                    <button className="btn-icon" title="Edit form" onClick={() => navigate(`/builder/${f.id}`)}><IconEdit /></button>
                    {f.published && <>
                      <button className="btn-icon" title="Copy share link" onClick={e => copyLink(e, f.id)}><IconLink /></button>
                      <button className="btn-icon" title="Preview" onClick={() => window.open(`/f/${f.id}`, '_blank')}><IconEye /></button>
                    </>}
                    <button className="btn-icon" title="View responses" onClick={() => navigate(`/responses/${f.id}`)}><IconResponses /></button>
                    <button className="btn-icon" title="Duplicate form"
                      onClick={e => duplicateForm(e, f)}
                      disabled={duplicating === f.id}
                      style={{ opacity: duplicating === f.id ? 0.5 : 1 }}
                    ><IconCopy /></button>
                    <div style={{ marginLeft: 'auto' }}>
                      <button className="btn-icon" style={{ color: 'var(--danger)', borderColor: 'rgba(192,57,43,0.2)' }}
                        title="Delete form" onClick={e => deleteForm(e, f.id)}><IconTrash /></button>
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
          <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>
            Gemini 1.5 Flash · Supabase
          </span>
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
      `}</style>
    </div>
  )
}
