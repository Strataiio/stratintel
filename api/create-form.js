import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

function genId() {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6)
}

const VALID_TYPES = ['text', 'textarea', 'email', 'phone', 'url', 'company', 'choice']

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed. Use POST.' })

  const secret = process.env.API_SECRET
  if (secret) {
    const auth = req.headers['authorization'] || ''
    if (auth !== `Bearer ${secret}`) return res.status(401).json({ error: 'Unauthorized.' })
  }

  let body
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body }
  catch { return res.status(400).json({ error: 'Invalid JSON body' }) }

  const { title, description, ai_instructions, fields, published, ai_enabled, redirect_url } = body

  const errs = []
  if (!title || typeof title !== 'string' || !title.trim()) errs.push('"title" is required')
  if (!fields || !Array.isArray(fields) || fields.length === 0) errs.push('"fields" must be a non-empty array')
  if (errs.length) return res.status(400).json({ error: 'Validation failed', details: errs })

  const normalisedFields = []
  const fieldErrors = []
  for (let i = 0; i < fields.length; i++) {
    const f = fields[i]
    const prefix = `fields[${i}]`
    if (!f || typeof f !== 'object') { fieldErrors.push(`${prefix}: must be an object`); continue }
    if (!f.label?.trim()) fieldErrors.push(`${prefix}: "label" is required`)
    if (!f.type) fieldErrors.push(`${prefix}: "type" is required`)
    else if (!VALID_TYPES.includes(f.type)) fieldErrors.push(`${prefix}: "type" must be one of: ${VALID_TYPES.join(', ')}`)
    if (f.type === 'choice' && (!f.choices || !Array.isArray(f.choices) || f.choices.length === 0)) {
      fieldErrors.push(`${prefix}: "choices" array required when type is "choice"`)
    }
    normalisedFields.push({
      id: genId(), type: f.type || 'text',
      label: (f.label || '').trim(),
      placeholder: (f.placeholder || '').trim(),
      description: (f.description || '').trim(),
      required: f.required === true,
      choices: Array.isArray(f.choices) ? f.choices.map(c => String(c).trim()).filter(Boolean) : []
    })
  }
  if (fieldErrors.length) return res.status(400).json({ error: 'Field validation failed', details: fieldErrors })

  const formId = genId()
  const formData = {
    id: formId,
    title: title.trim(),
    description: (description || '').trim(),
    ai_instructions: (ai_instructions || '').trim(),
    fields: normalisedFields,
    published: published === true,
    ai_enabled: ai_enabled !== false,   // default true
    redirect_url: (redirect_url || '').trim(),
  }

  const { data, error } = await supabase.from('strat_forms').insert(formData).select().single()
  if (error) return res.status(500).json({ error: 'Database error', details: error.message })

  const shareUrl = `https://stratintel.vercel.app/f/${formId}`
  return res.status(201).json({
    success: true,
    message: `Form "${data.title}" created with ${normalisedFields.length} field(s). AI: ${formData.ai_enabled ? 'ON' : 'OFF'}`,
    form: {
      id: data.id, title: data.title, description: data.description,
      ai_instructions: data.ai_instructions, fields: data.fields,
      published: data.published, ai_enabled: data.ai_enabled,
      redirect_url: data.redirect_url, created_at: data.created_at,
      share_url: shareUrl,
      builder_url: `https://stratintel.vercel.app/builder/${formId}`
    }
  })
}
