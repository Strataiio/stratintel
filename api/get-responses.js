import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed. Use GET.' })

  const secret = process.env.API_SECRET
  if (secret) {
    const auth = req.headers['authorization'] || ''
    if (auth !== `Bearer ${secret}`) return res.status(401).json({ error: 'Unauthorized' })
  }

  const { form_id, limit = '50', offset = '0' } = req.query
  if (!form_id) return res.status(400).json({ error: 'Missing ?form_id=<form_id> query param' })

  const limitN = Math.min(parseInt(limit) || 50, 200)
  const offsetN = parseInt(offset) || 0

  const { data, error, count } = await supabase
    .from('strat_responses')
    .select('*', { count: 'exact' })
    .eq('form_id', form_id)
    .order('created_at', { ascending: false })
    .range(offsetN, offsetN + limitN - 1)

  if (error) return res.status(500).json({ error: 'Database error', details: error.message })

  return res.status(200).json({
    success: true,
    form_id,
    total: count ?? 0,
    limit: limitN,
    offset: offsetN,
    responses: (data || []).map(r => ({
      id: r.id,
      form_id: r.form_id,
      form_title: r.form_title,
      respondent_email: r.respondent_email,
      response_data: r.response_data,
      ai_report: r.ai_report,
      created_at: r.created_at
    }))
  })
}
