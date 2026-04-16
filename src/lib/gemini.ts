import { GoogleGenerativeAI } from '@google/generative-ai'

export async function analyzeWithGemini(
  formTitle: string,
  fields: Array<{ label: string; value: string }>,
  instructions: string
): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

  const responseText = fields
    .map(f => `${f.label}: ${f.value || '(not provided)'}`)
    .join('\n')

  const systemContext = instructions ||
    'You are a helpful business analyst. Analyze the form responses and provide clear, actionable insights tailored to the respondent. Structure your response with clear sections. Be specific and practical.'

  const prompt = `${systemContext}

---
Form: ${formTitle}

Respondent Answers:
${responseText}
---

Analyze these responses and provide your insights. Use clear headings and bullet points where helpful. Be specific and actionable.`

  const result = await model.generateContent(prompt)
  return result.response.text()
}
