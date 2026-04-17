import { GoogleGenerativeAI } from '@google/generative-ai'

// Key storage — localStorage takes precedence over env var so dashboard can override
export const GEMINI_KEY_STORAGE = 'stratintel_gemini_key'

export function getGeminiApiKey(): string {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(GEMINI_KEY_STORAGE)
    if (stored && stored.trim()) return stored.trim()
  }
  return (import.meta.env.VITE_GEMINI_API_KEY as string) || ''
}

export function setGeminiApiKey(key: string) {
  if (key.trim()) {
    localStorage.setItem(GEMINI_KEY_STORAGE, key.trim())
  } else {
    localStorage.removeItem(GEMINI_KEY_STORAGE)
  }
}

export function clearGeminiApiKey() {
  localStorage.removeItem(GEMINI_KEY_STORAGE)
}

export async function testGeminiApiKey(key: string): Promise<{ ok: boolean; model?: string; error?: string }> {
  const genAI = new GoogleGenerativeAI(key)
  const modelNames = [
    'gemini-2.0-flash', 'gemini-2.0-flash-001',
    'gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-flash-001',
  ]
  for (const modelName of modelNames) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName })
      const result = await model.generateContent('Respond with exactly: OK')
      const text = result.response.text()
      if (text) return { ok: true, model: modelName }
    } catch (err: any) {
      if (err?.status === 403 || err?.message?.includes('API key')) {
        return { ok: false, error: 'API key is invalid or has been flagged. Generate a new one at aistudio.google.com/apikey' }
      }
      // 404 = model not available, try next
      continue
    }
  }
  return { ok: false, error: 'No Gemini model available for this API key. Please check aistudio.google.com/apikey' }
}

export async function analyzeWithGemini(
  formTitle: string,
  fields: Array<{ label: string; value: string }>,
  instructions: string
): Promise<string> {
  const apiKey = getGeminiApiKey()

  if (!apiKey) {
    throw new Error('Gemini API key is not configured. Go to Dashboard → Settings to add your API key.')
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const modelNames = [
    'gemini-2.0-flash', 'gemini-2.0-flash-001',
    'gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-flash-001',
  ]

  const responseText = fields
    .map(f => `${f.label}: ${f.value || '(not provided)'}`)
    .join('\n')

  const systemContext = instructions?.trim() ||
    'You are a helpful business analyst. Analyze the form responses and provide clear, actionable insights tailored to the respondent. Structure your response with clear sections. Be specific and practical.'

  const prompt = `${systemContext}

---
Form: ${formTitle}

Respondent Answers:
${responseText}
---

Analyze these responses and provide your insights. Use clear headings and bullet points where helpful. Be specific and actionable.`

  let lastError: Error | null = null
  for (const modelName of modelNames) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName })
      const result = await model.generateContent(prompt)
      return result.response.text()
    } catch (err: any) {
      if (err?.status === 403 || err?.message?.includes('API key')) {
        throw new Error('Gemini API key is invalid or flagged. Go to Dashboard → Settings to update your API key.')
      }
      lastError = err
      continue
    }
  }
  throw lastError || new Error('No Gemini model available. Go to Dashboard → Settings to check your API key.')
}
