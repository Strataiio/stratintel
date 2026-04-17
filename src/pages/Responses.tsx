import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase, StratForm, FormResponse } from '../lib/supabase'
import { downloadText, formatDateTime } from '../lib/utils'
import Topbar from '../components/Topbar'
import { IconBack, IconDownload, IconSparkle } from '../components/Icons'

function downloadCSV(form: StratForm, responses: FormResponse[]) {
  const headers = ['#', 'Submitted At', 'Respondent Email',
    ...form.fields.map(f => f.label), 'AI Report']
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
  a.download = `stratintel-${form.title.toLowerCase().replace(/\s+/g, '-')}-responses.csv`
  a.click(); URL.revokeObjectURL(a.href)
}

function downloadSingleReport(form: StratForm, resp: FormResponse) {
  const lines = [
    `STRATINTEL — AI ANALYSIS REPORT`,
    `${'═'.repeat(42)}`,
    `Form: ${resp.form_title}`,
    `Date: ${formatDateTime(resp.created_at)}`,
    `Respondent: ${resp.respondent_email || '—'}`,
    ``, `FORM RESPONSES`, `${'─'.repeat(30)}`,
    ...form.fields.map(f => `${f.label}: ${resp.response_data[f.id] || '—'}`),
    ``, `AI ANALYSIS`, `${'─'.repeat(30)}`,
    resp.ai_report || '(no AI report)'
  ]
  downloadText(lines.join('\n'), `stratintel-${resp.id.slice(0, 8)}.txt`)
}

// ── Response Detail Panel ─────────────────────────────────────────────────────
function ResponseDetail({ form, resp, onBack, onDownload }: {
  form: StratForm
  resp: FormResponse
  onBack: () => void
  onDownload: () => void
}) {
  return (
    <div className="fade-up">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <button className="btn btn-ghost btn-sm" onClick={onBack}>
          <IconBack /> All Responses
        </button>
        <button className="btn btn-sm" onClick={onDownload}>
          <IconDownload /> Export .txt
        </button>
      </div>

      {/* Respondent meta */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{
            width: 40, height: 40, background: 'var(--orange-lt)', borderRadius: '50%',
            border: '2px solid var(--orange)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontFamily: 'var(--font-head)', fontWeight: 800,
            fontSize: 14, color: 'var(--orange)', flexShrink: 0,
          }}>
            {(resp.respondent_email || 'A').charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
              {resp.respondent_email || 'Anonymous Respondent'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
              Submitted {formatDateTime(resp.created_at)}
            </div>
          </div>
        </div>

        {/* Form answers grid */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Form Answers</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {form.fields.map(f => {
              const val = resp.response_data[f.id]
              return (
                <div key={f.id} style={{
                  background: 'var(--off-white)', borderRadius: 'var(--r)',
                  border: '1px solid var(--border)', padding: '10px 13px',
                }}>
                  <div style={{
                    fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-head)',
                    fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5,
                  }}>{f.label}</div>
                  <div style={{
                    fontSize: 13, color: val ? 'var(--text)' : 'var(--text3)',
                    lineHeight: 1.5, wordBreak: 'break-word',
                    fontStyle: val ? 'normal' : 'italic',
                  }}>
                    {val || '—'}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* AI Report */}
      {resp.ai_report ? (
        <div className="result-card">
          <div className="result-header">
            <span className="badge badge-ai"><IconSparkle /> Gemini AI Analysis</span>
            <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>
              {formatDateTime(resp.created_at)}
            </span>
          </div>
          <div className="result-content">{resp.ai_report}</div>
        </div>
      ) : (
        <div className="card" style={{ background: 'var(--off-white)', textAlign: 'center', padding: '28px' }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-head)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            No AI Report — AI was disabled for this form
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Responses Page ───────────────────────────────────────────────────────
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

  if (loading) return (
    <div className="app"><Topbar />
      <div className="main" style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text3)' }}>
        <div className="spinner" /> Loading responses…
      </div>
    </div>
  )

  if (!form) return (
    <div className="app"><Topbar />
      <div className="main"><p style={{ color: 'var(--text3)' }}>Form not found.</p></div>
    </div>
  )

  return (
    <div className="app">
      <Topbar right={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {!selected && responses.length > 0 && (
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
          {/* Header */}
          <div className="section-head" style={{ marginBottom: 20 }}>
            <div>
              <div className="eyebrow">Responses</div>
              <h1 className="section-title" style={{ fontSize: 18 }}>
                {form.title || 'Untitled Form'}
              </h1>
              <p className="section-sub">
                {responses.length} response{responses.length !== 1 ? 's' : ''}
                {responses.length > 0 && ` · Latest ${formatDateTime(responses[0]?.created_at)}`}
              </p>
            </div>
          </div>

          {/* Detail view */}
          {selected ? (
            <ResponseDetail
              form={form}
              resp={selected}
              onBack={() => setSelected(null)}
              onDownload={() => downloadSingleReport(form, selected)}
            />
          ) : responses.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">◈</div>
              <p style={{ fontFamily: 'var(--font-head)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                No responses yet
              </p>
              <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20 }}>
                Share the form link to start collecting.
              </p>
              {form.published && (
                <button className="btn btn-sm" onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/f/${form.id}`)
                  alert('Link copied!')
                }}>Copy Share Link</button>
              )}
            </div>
          ) : (
            <>
              {/* Stats bar */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
                padding: '10px 16px', background: 'var(--off-white)',
                borderRadius: 'var(--r)', border: '1px solid var(--border)', marginBottom: 16,
              }}>
                <span style={{ fontSize: 11, fontFamily: 'var(--font-head)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text2)' }}>
                  {responses.length} total
                </span>
                <span style={{ color: 'var(--border2)', fontSize: 10 }}>◆</span>
                <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>
                  {responses.filter(r => r.ai_report).length} with AI report
                </span>
                <span style={{ color: 'var(--border2)', fontSize: 10 }}>◆</span>
                <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>
                  {responses.filter(r => r.respondent_email).length} with email
                </span>
                <div style={{ marginLeft: 'auto' }}>
                  <button className="btn btn-sm" onClick={() => downloadCSV(form, responses)}>
                    <IconDownload /> Export all CSV
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="resp-table">
                  <thead>
                    <tr>
                      <th style={{ width: 36 }}>#</th>
                      <th>Respondent</th>
                      {/* Show first 2 non-email fields as preview columns */}
                      {form.fields
                        .filter(f => f.type !== 'email')
                        .slice(0, 2)
                        .map(f => <th key={f.id}>{f.label}</th>)
                      }
                      <th>AI Report</th>
                      <th style={{ width: 80 }}>Submitted</th>
                      <th style={{ width: 36 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {responses.map((r, i) => (
                      <tr key={r.id} onClick={() => setSelected(r)}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text3)' }}>
                          {String(responses.length - i).padStart(2, '0')}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{
                              width: 26, height: 26, background: 'var(--orange-lt)',
                              border: '1px solid rgba(232,97,42,0.2)', borderRadius: '50%',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 10, fontWeight: 700, color: 'var(--orange)',
                              fontFamily: 'var(--font-head)', flexShrink: 0,
                            }}>
                              {(r.respondent_email || 'A').charAt(0).toUpperCase()}
                            </div>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                              {r.respondent_email || <span style={{ color: 'var(--text3)' }}>anonymous</span>}
                            </span>
                          </div>
                        </td>
                        {/* Preview columns */}
                        {form.fields
                          .filter(f => f.type !== 'email')
                          .slice(0, 2)
                          .map(f => (
                            <td key={f.id} style={{ maxWidth: 160 }}>
                              <span style={{
                                display: 'block', overflow: 'hidden',
                                textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                fontSize: 12, color: 'var(--text2)',
                              }}>
                                {r.response_data[f.id] || <span style={{ color: 'var(--text3)' }}>—</span>}
                              </span>
                            </td>
                          ))
                        }
                        {/* AI report preview */}
                        <td style={{ maxWidth: 200 }}>
                          {r.ai_report ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 3,
                                fontSize: 10, padding: '2px 7px',
                                background: 'var(--orange-lt)', color: 'var(--orange)',
                                borderRadius: 4, border: '1px solid rgba(232,97,42,0.2)',
                                fontFamily: 'var(--font-head)', fontWeight: 600, flexShrink: 0,
                              }}>
                                <IconSparkle /> AI
                              </span>
                              <span style={{
                                fontSize: 12, color: 'var(--text3)', overflow: 'hidden',
                                textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              }}>
                                {r.ai_report.slice(0, 60)}…
                              </span>
                            </div>
                          ) : (
                            <span style={{ fontSize: 11, color: 'var(--text3)' }}>—</span>
                          )}
                        </td>
                        <td style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text3)', whiteSpace: 'nowrap' }}>
                          {formatDateTime(r.created_at)}
                        </td>
                        <td onClick={e => { e.stopPropagation(); downloadSingleReport(form, r) }}>
                          <button className="btn-icon" title="Download report"><IconDownload /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 10, fontFamily: 'var(--font-mono)' }}>
                Click any row to see the full response and AI report.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
