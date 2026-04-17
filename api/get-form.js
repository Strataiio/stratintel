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

  const { id } = req.query
  if (!id) return res.status(400).json({ error: 'Missing ?id=<form_id> query param' })

  const { data, error } = await supabase
    .from('strat_forms').select('*').eq('id', id).single()

  if (error || !data) return res.status(404).json({ error: 'Form not found', id })

  const { count } = await supabase
    .from('strat_responses').select('id', { count: 'exact', head: true }).eq('form_id', id)

  return res.status(200).json({
    success: true,
    form: {
      ...data,
      response_count: count ?? 0,
      share_url: `https://stratintel.vercel.app/f/${data.id}`,
      builder_url: `https://stratintel.vercel.app/builder/${data.id}`,
      responses_url: `https://stratintel.vercel.app/responses/${data.id}`
    }
  })
}
