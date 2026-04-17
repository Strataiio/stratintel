import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, StratForm } from '../lib/supabase'
import { genId, showToast, formatDate } from '../lib/utils'
import Topbar from '../components/Topbar'
import { IconPlus, IconTrash, IconLink, IconEye, IconEdit, IconResponses } from '../components/Icons'

export default function Dashboard() {
  const navigate = useNavigate()
  const [forms, setForms] = useState<StratForm[]>([])
  const [loading, setLoading] = useState(true)
  const [respCounts, setRespCounts] = useState<Record<string, number>>({})

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
    const { error } = await supabase.from('strat_forms').insert({ id, title: '', description: '', ai_instructions: '', fields: [], published: false })
    if (error) { showToast('Error: ' + error.message); return }
    navigate(`/builder/${id}`)
  }

  async function deleteForm(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    if (!confirm('Delete this form and all responses?')) return
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
        <button className="btn btn-primary btn-sm" onClick={createNew}>
          <IconPlus /> New Form
        </button>
      } />
      <div className="main">
        <div className="fade-up">
          {/* Header */}
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

          {/* Content */}
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text3)', padding: '40px 0' }}>
              <div className="spinner" /> Loading forms…
            </div>
          ) : forms.length === 0 ? (
            <div className="empty fade-up-2">
              <div className="empty-icon">◈</div>
              <p style={{ fontSize: 14, marginBottom: 20, fontFamily: 'var(--font-head)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>No forms yet</p>
              <button className="btn btn-primary" onClick={createNew}><IconPlus /> Create your first form</button>
            </div>
          ) : (
            <div className="forms-grid fade-up-2">
              {forms.map(f => (
                <div
                  key={f.id}
                  className="card card-hover"
                  style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
                  onClick={() => navigate(`/builder/${f.id}`)}
                >
                  {/* Title + badge */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ fontFamily: 'var(--font-head)', fontSize: 14, fontWeight: 700, lineHeight: 1.3, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                      {f.title || 'Untitled Form'}
                    </div>
                    <span className={`badge ${f.published ? 'badge-live' : 'badge-draft'}`}>
                      {f.published ? 'Live' : 'Draft'}
                    </span>
                  </div>

                  {/* Description */}
                  {f.description && (
                    <p style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.55 }}>
                      {f.description.slice(0, 90)}{f.description.length > 90 ? '…' : ''}
                    </p>
                  )}

                  {/* Meta */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>
                    <span>{f.fields?.length ?? 0} fields</span>
                    <span style={{ color: 'var(--border2)' }}>◆</span>
                    <span>{respCounts[f.id] ?? 0} responses</span>
                    <span style={{ color: 'var(--border2)' }}>◆</span>
                    <span>{formatDate(f.created_at)}</span>
                  </div>

                  {/* Actions */}
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--border)' }}
                    onClick={e => e.stopPropagation()}
                  >
                    <button className="btn-icon" title="Edit" onClick={() => navigate(`/builder/${f.id}`)}><IconEdit /></button>
                    {f.published && <>
                      <button className="btn-icon" title="Copy share link" onClick={e => copyLink(e, f.id)}><IconLink /></button>
                      <button className="btn-icon" title="Preview form" onClick={() => window.open(`/f/${f.id}`, '_blank')}><IconEye /></button>
                    </>}
                    <button className="btn-icon" title="View responses" onClick={() => navigate(`/responses/${f.id}`)}><IconResponses /></button>
                    <div style={{ marginLeft: 'auto' }}>
                      <button className="btn-icon btn-danger" onClick={e => deleteForm(e, f.id)}><IconTrash /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
