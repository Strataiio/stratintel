import { GoogleGenerativeAI } from '@google/generative-ai'

export const GEMINI_KEY_STORAGE = 'stratintel_gemini_key'

export function getGeminiApiKey(): string {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(GEMINI_KEY_STORAGE)
    if (stored && stored.trim()) return stored.trim()
  }
  return (import.meta.env.VITE_GEMINI_API_KEY as string) || ''
}

export function setGeminiApiKey(key: string) {
  if (key.trim()) localStorage.setItem(GEMINI_KEY_STORAGE, key.trim())
  else localStorage.removeItem(GEMINI_KEY_STORAGE)
}

export function clearGeminiApiKey() {
  localStorage.removeItem(GEMINI_KEY_STORAGE)
}

// Models to try in order — uses v1 endpoint (not v1beta)
const MODELS = [
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
  'gemini-pro',
]

async function tryModel(apiKey: string, modelName: string, prompt: string): Promise<string> {
  // Call the REST API directly using v1 endpoint to avoid SDK version issues
  const url = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${apiKey}`
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 2048 }
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err?.error?.message || res.statusText
    const code = res.status
    throw Object.assign(new Error(msg), { status: code, model: modelName })
  }
  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Empty response from Gemini')
  return text
}

export async function testGeminiApiKey(key: string): Promise<{ ok: boolean; model?: string; error?: string }> {
  if (!key?.trim()) return { ok: false, error: 'No API key provided' }
  for (const modelName of MODELS) {
    try {
      await tryModel(key.trim(), modelName, 'Respond with exactly one word: OK')
      return { ok: true, model: modelName }
    } catch (err: any) {
      if (err?.status === 400) return { ok: false, error: 'Invalid API key format. Get a key at aistudio.google.com/apikey' }
      if (err?.status === 403) return { ok: false, error: 'API key is invalid or has been flagged/revoked. Generate a fresh key at aistudio.google.com/apikey' }
      if (err?.status === 429) return { ok: false, error: 'Rate limit hit. Try again in a moment.' }
      // 404 = model not available for this key, try next
      continue
    }
  }
  return { ok: false, error: 'No Gemini model responded. Your API key may be invalid. Get a new key at aistudio.google.com/apikey' }
}

export async function analyzeWithGemini(
  formTitle: string,
  fields: Array<{ label: string; value: string }>,
  instructions: string
): Promise<string> {
  const apiKey = getGeminiApiKey()

  if (!apiKey) {
    throw new Error(
      'No Gemini API key configured. Go to Dashboard → Settings → paste your API key from aistudio.google.com/apikey'
    )
  }

  const responseText = fields
    .map(f => `${f.label}: ${f.value || '(not provided)'}`)
    .join('\n')

  const systemContext = instructions?.trim() ||
    'You are a helpful business analyst. Analyze the form responses and provide clear, actionable insights tailored to the respondent. Use clear sections, be specific and practical.'

  const prompt = `${systemContext}

---
Form: ${formTitle}

Respondent Answers:
${responseText}
---

Analyze these responses and provide your insights. Use clear headings and bullet points where helpful. Be specific and actionable.`

  let lastErr: any = null
  for (const modelName of MODELS) {
    try {
      return await tryModel(apiKey, modelName, prompt)
    } catch (err: any) {
      lastErr = err
      if (err?.status === 400) {
        throw new Error('Invalid API key. Go to Dashboard → Settings and update your Gemini API key.')
      }
      if (err?.status === 403) {
        throw new Error(
          'Your Gemini API key has been flagged or revoked by Google. ' +
          'Please generate a new key at aistudio.google.com/apikey, then go to Dashboard → Settings → paste the new key.'
        )
      }
      if (err?.status === 429) {
        throw new Error('Gemini rate limit reached. Please wait a moment and try again.')
      }
      // 404 = try next model
      continue
    }
  }

  const msg = lastErr?.message || 'Unknown error'
  throw new Error(
    `Gemini AI unavailable: ${msg}\n\n` +
    'Please go to Dashboard → Settings → Test your API key, or generate a new one at aistudio.google.com/apikey'
  )
}
