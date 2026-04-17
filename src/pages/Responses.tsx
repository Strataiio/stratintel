import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase, StratForm, FormResponse } from '../lib/supabase'
import { downloadText, formatDateTime } from '../lib/utils'
import Topbar from '../components/Topbar'
import { IconBack, IconDownload, IconSparkle } from '../components/Icons'

function downloadCSV(form: StratForm, responses: FormResponse[]) {
  const headers = ['Response #', 'Submitted At', 'Respondent Email', ...form.fields.map(f => f.label), 'AI Report']
  const rows = responses.map((r, i) => [
    String(i + 1),
    formatDateTime(r.created_at),
    r.respondent_email || '',
    ...form.fields.map(f => `"${(r.response_data[f.id] || '').replace(/"/g, '""')}"`),
    `"${(r.ai_report || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`
  ])
  const csv = [headers.map(h => `"${h}"`).join(','), ...rows.map(r => r.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
  a.download = `stratintel-${form.title.toLowerCase().replace(/\s+/g,'-')}-responses.csv`
  a.click(); URL.revokeObjectURL(a.href)
}

export default function Responses() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [form, setForm] = useState<StratForm | null>(null)
  const [responses, setResponses] = useState<FormResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<FormResponse | null>(null)

  useEffect(() => { if (id) load(id) }, [id])

  async function load(fid: string) {
    const [{ data: f }, { data: r }] = await Promise.all([
      supabase.from('strat_forms').select('*').eq('id', fid).single(),
      supabase.from('strat_responses').select('*').eq('form_id', fid).order('created_at', { ascending: false })
    ])
    if (f) setForm(f)
    if (r) setResponses(r)
    setLoading(false)
  }

  function downloadReport(resp: FormResponse) {
    const lines = [
      `STRATINTEL — AI ANALYSIS REPORT`,
      `${'═'.repeat(42)}`,
      `Form: ${resp.form_title}`,
      `Date: ${formatDateTime(resp.created_at)}`,
      `Respondent: ${resp.respondent_email || '—'}`,
      ``, `FORM RESPONSES`, `${'─'.repeat(30)}`
    ]
    if (form) form.fields.forEach(f => lines.push(`${f.label}: ${resp.response_data[f.id] || '—'}`))
    lines.push(``, `AI ANALYSIS`, `${'─'.repeat(30)}`, resp.ai_report)
    downloadText(lines.join('\n'), `stratintel-${resp.id.slice(0, 8)}.txt`)
  }

  if (loading) return (
    <div className="app"><Topbar />
      <div className="main" style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text3)' }}>
        <div className="spinner" /> Loading responses…
      </div>
    </div>
  )

  return (
    <div className="app">
      <Topbar right={
        <div style={{ display: 'flex', gap: 8 }}>
          {form && responses.length > 0 && (
            <button className="btn btn-sm" onClick={() => downloadCSV(form, responses)}>
              <IconDownload /> Export CSV
            </button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/builder/${id}`)}>
            <IconBack /> Builder
          </button>
        </div>
      } />
      <div className="main">
        <div className="fade-up">
          <div className="section-head" style={{ marginBottom: 20 }}>
            <div>
              <div className="eyebrow">Response Data</div>
              <h1 className="section-title">{form?.title || 'Responses'}</h1>
              <p className="section-sub">{responses.length} response{responses.length !== 1 ? 's' : ''} collected</p>
            </div>
          </div>

          {selected ? (
            /* ── Detail view ── */
            <div className="fade-up" style={{ maxWidth: 700 }}>
              <button className="btn btn-ghost btn-sm" style={{ marginBottom: 20 }} onClick={() => setSelected(null)}>
                <IconBack /> All Responses
              </button>

              {/* Respondent card */}
              <div className="card" style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      {selected.respondent_email || 'Anonymous Respondent'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginTop: 3 }}>
                      {formatDateTime(selected.created_at)}
                    </div>
                  </div>
                  <button className="btn btn-sm" onClick={() => downloadReport(selected)}>
                    <IconDownload /> Export
                  </button>
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                  <div className="eyebrow" style={{ marginBottom: 14 }}>Form Answers</div>
                  <div style={{ display: 'grid', gap: 14 }}>
                    {form?.fields.map(f => (
                      <div key={f.id}>
                        <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-head)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                          {f.label}
                        </div>
                        <div style={{ fontSize: 14, color: selected.response_data[f.id] ? 'var(--text)' : 'var(--text3)' }}>
                          {selected.response_data[f.id] || '—'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* AI report */}
              <div className="result-card">
                <div className="result-header">
                  <span className="badge badge-ai"><IconSparkle /> Gemini AI Analysis</span>
                  <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>
                    {formatDateTime(selected.created_at)}
                  </span>
                </div>
                <div className="result-content">{selected.ai_report}</div>
              </div>
            </div>
          ) : responses.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">◈</div>
              <p style={{ fontFamily: 'var(--font-head)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                No responses yet
              </p>
              <p style={{ fontSize: 13, color: 'var(--text3)' }}>Share the form link to start collecting.</p>
              {form?.published && (
                <button className="btn btn-sm" style={{ marginTop: 16 }}
                  onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/f/${form.id}`) }}>
                  <IconBack /> Copy Share Link
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Summary bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, padding: '10px 16px', background: 'var(--off-white)', borderRadius: 'var(--r)', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: 11, fontFamily: 'var(--font-head)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text3)' }}>
                  {responses.length} total
                </span>
                <span style={{ fontSize: 11, color: 'var(--border2)' }}>◆</span>
                <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text3)' }}>
                  Latest: {formatDateTime(responses[0]?.created_at)}
                </span>
                <div style={{ marginLeft: 'auto' }}>
                  <button className="btn btn-sm" onClick={() => downloadCSV(form!, responses)}>
                    <IconDownload /> Export all as CSV
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="resp-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Respondent</th>
                      <th>Submitted</th>
                      <th>AI Report Preview</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {responses.map((r, i) => (
                      <tr key={r.id} onClick={() => setSelected(r)}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text3)' }}>
                          {String(responses.length - i).padStart(2, '0')}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                          {r.respondent_email || <span style={{ color: 'var(--text3)' }}>anonymous</span>}
                        </td>
                        <td style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text3)' }}>
                          {formatDateTime(r.created_at)}
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--text3)', maxWidth: 260 }}>
                          <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {r.ai_report?.slice(0, 90)}…
                          </span>
                        </td>
                        <td onClick={e => { e.stopPropagation(); downloadReport(r) }}>
                          <button className="btn-icon"><IconDownload /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
