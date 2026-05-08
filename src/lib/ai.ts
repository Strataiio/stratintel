// ── StratIntel AI Provider Layer ─────────────────────────────────────────────
// Supports: Gemini (Google) and OpenAI
// Provider + keys stored in localStorage, falling back to env vars

export type AIProvider = 'gemini' | 'openai'

// ── Storage keys ─────────────────────────────────────────────────────────────
export const PROVIDER_KEY    = 'stratintel_ai_provider'
export const GEMINI_KEY_STORAGE = 'stratintel_gemini_key'
export const OPENAI_KEY_STORAGE = 'stratintel_openai_key'
export const OPENAI_MODEL_STORAGE = 'stratintel_openai_model'

// ── Provider getters/setters ─────────────────────────────────────────────────
export function getProvider(): AIProvider {
  return (localStorage.getItem(PROVIDER_KEY) as AIProvider) || 'gemini'
}
export function setProvider(p: AIProvider) {
  localStorage.setItem(PROVIDER_KEY, p)
}

// ── Gemini ────────────────────────────────────────────────────────────────────
export function getGeminiApiKey(): string {
  return localStorage.getItem(GEMINI_KEY_STORAGE)?.trim()
    || (import.meta.env.VITE_GEMINI_API_KEY as string)?.trim()
    || ''
}
export function setGeminiApiKey(k: string) {
  k.trim() ? localStorage.setItem(GEMINI_KEY_STORAGE, k.trim()) : localStorage.removeItem(GEMINI_KEY_STORAGE)
}
export function clearGeminiApiKey() { localStorage.removeItem(GEMINI_KEY_STORAGE) }

const GEMINI_MODELS = [
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
  'gemini-pro',
]

async function callGemini(apiKey: string, model: string, prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 2048 },
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw Object.assign(new Error(err?.error?.message || res.statusText), { status: res.status })
  }
  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Empty response from Gemini')
  return text
}

export async function testGeminiKey(key: string): Promise<{ ok: boolean; model?: string; error?: string }> {
  if (!key?.trim()) return { ok: false, error: 'No API key provided' }
  for (const model of GEMINI_MODELS) {
    try {
      await callGemini(key.trim(), model, 'Reply with one word: OK')
      return { ok: true, model }
    } catch (e: any) {
      if (e?.status === 403) return { ok: false, error: 'API key is invalid or flagged. Get a new one at aistudio.google.com/apikey' }
      if (e?.status === 400) return { ok: false, error: 'Invalid API key format.' }
      if (e?.status === 429) return { ok: false, error: 'Rate limit hit. Try again shortly.' }
      continue // 404 = model unavailable, try next
    }
  }
  return { ok: false, error: 'No Gemini model responded. Check your key at aistudio.google.com/apikey' }
}

// ── OpenAI ────────────────────────────────────────────────────────────────────
export function getOpenAIApiKey(): string {
  return localStorage.getItem(OPENAI_KEY_STORAGE)?.trim()
    || (import.meta.env.VITE_OPENAI_API_KEY as string)?.trim()
    || ''
}
export function setOpenAIApiKey(k: string) {
  k.trim() ? localStorage.setItem(OPENAI_KEY_STORAGE, k.trim()) : localStorage.removeItem(OPENAI_KEY_STORAGE)
}
export function clearOpenAIApiKey() { localStorage.removeItem(OPENAI_KEY_STORAGE) }

export function getOpenAIModel(): string {
  return localStorage.getItem(OPENAI_MODEL_STORAGE) || 'gpt-4o-mini'
}
export function setOpenAIModel(m: string) {
  localStorage.setItem(OPENAI_MODEL_STORAGE, m)
}

export const OPENAI_MODELS = [
  { value: 'gpt-4o-mini',  label: 'GPT-4o Mini  (fast, cheap)' },
  { value: 'gpt-4o',       label: 'GPT-4o  (best quality)' },
  { value: 'gpt-4-turbo',  label: 'GPT-4 Turbo' },
  { value: 'gpt-3.5-turbo',label: 'GPT-3.5 Turbo  (legacy)' },
]

async function callOpenAI(apiKey: string, model: string, systemPrompt: string, userMessage: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMessage },
      ],
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err?.error?.message || res.statusText
    throw Object.assign(new Error(msg), { status: res.status })
  }
  const data = await res.json()
  const text = data?.choices?.[0]?.message?.content
  if (!text) throw new Error('Empty response from OpenAI')
  return text
}

export async function testOpenAIKey(key: string, model = 'gpt-4o-mini'): Promise<{ ok: boolean; model?: string; error?: string }> {
  if (!key?.trim()) return { ok: false, error: 'No API key provided' }
  try {
    await callOpenAI(key.trim(), model, 'You are a helpful assistant.', 'Reply with one word: OK')
    return { ok: true, model }
  } catch (e: any) {
    if (e?.status === 401) return { ok: false, error: 'Invalid API key. Get one at platform.openai.com/api-keys' }
    if (e?.status === 403) return { ok: false, error: 'API key lacks permission for this model.' }
    if (e?.status === 429) return { ok: false, error: 'Rate limit or quota exceeded. Check platform.openai.com/usage' }
    if (e?.status === 404) return { ok: false, error: `Model "${model}" not found. Try gpt-4o-mini.` }
    return { ok: false, error: e?.message || 'Unknown error from OpenAI' }
  }
}

// ── Unified analysis entry point ──────────────────────────────────────────────
export async function analyzeWithAI(
  formTitle: string,
  fields: Array<{ label: string; value: string }>,
  instructions: string
): Promise<string> {
  const provider = getProvider()
  const responseText = fields.map(f => `${f.label}: ${f.value || '(not provided)'}`).join('\n')

  const systemPrompt = instructions?.trim() ||
    'You are a helpful business analyst. Analyze the form responses and provide clear, actionable insights. Use clear sections and bullet points. Be specific and practical.'

  const userMessage =
    `Form: ${formTitle}\n\nRespondent Answers:\n${responseText}\n\n---\nAnalyze these responses and provide insights.`

  if (provider === 'openai') {
    const apiKey = getOpenAIApiKey()
    if (!apiKey) throw new Error('No OpenAI API key configured. Go to Dashboard → Settings to add your key from platform.openai.com/api-keys')
    const model = getOpenAIModel()
    try {
      return await callOpenAI(apiKey, model, systemPrompt, userMessage)
    } catch (e: any) {
      if (e?.status === 401) throw new Error('OpenAI API key is invalid. Go to Dashboard → Settings to update it.')
      if (e?.status === 429) throw new Error('OpenAI rate limit or quota exceeded. Check platform.openai.com/usage')
      if (e?.status === 403) throw new Error('OpenAI API key lacks permission. Check your plan at platform.openai.com')
      throw new Error(`OpenAI error: ${e?.message || 'Unknown error'}`)
    }
  }

  // Default: Gemini
  const apiKey = getGeminiApiKey()
  if (!apiKey) throw new Error('No Gemini API key configured. Go to Dashboard → Settings to add your key from aistudio.google.com/apikey')

  const fullPrompt = `${systemPrompt}\n\n---\nForm: ${formTitle}\n\nRespondent Answers:\n${responseText}\n---\n\nAnalyze and provide insights.`
  let lastErr: any = null
  for (const model of GEMINI_MODELS) {
    try {
      return await callGemini(apiKey, model, fullPrompt)
    } catch (e: any) {
      lastErr = e
      if (e?.status === 403) throw new Error('Gemini API key is flagged or revoked. Go to Dashboard → Settings → generate a new key at aistudio.google.com/apikey')
      if (e?.status === 400) throw new Error('Gemini API key is invalid. Go to Dashboard → Settings to update it.')
      if (e?.status === 429) throw new Error('Gemini rate limit. Please wait and try again.')
      continue
    }
  }
  throw new Error(`Gemini unavailable: ${lastErr?.message || 'No models responded'}. Go to Dashboard → Settings to check your API key.`)
}

// ── Legacy compat export (used by FillForm) ───────────────────────────────────
export async function analyzeWithGemini(
  formTitle: string,
  fields: Array<{ label: string; value: string }>,
  instructions: string
): Promise<string> {
  return analyzeWithAI(formTitle, fields, instructions)
}
