import { GoogleGenerativeAI } from '@google/generative-ai'

export async function analyzeWithGemini(
  formTitle: string,
  fields: Array<{ label: string; value: string }>,
  instructions: string
): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string

  if (!apiKey || apiKey.trim() === '') {
    throw new Error('Gemini API key is not configured. Please add VITE_GEMINI_API_KEY to your environment variables.')
  }

  const genAI = new GoogleGenerativeAI(apiKey)

  // Try models in order of preference — handles API key region / version differences
  const modelNames = [
    'gemini-2.0-flash',
    'gemini-2.0-flash-001',
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash-001',
    'gemini-1.0-pro',
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
      // 404 = model not available for this key, try next
      // 403 = key issue, no point trying more models
      if (err?.status === 403 || err?.message?.includes('API key')) {
        throw new Error(
          'Gemini API key is invalid or has been flagged. Please generate a new API key at aistudio.google.com and update VITE_GEMINI_API_KEY in your Vercel environment variables.'
        )
      }
      lastError = err
      // 404 = try next model
      continue
    }
  }

  throw lastError || new Error('No Gemini model available. Please check your API key at aistudio.google.com/apikey')
}
