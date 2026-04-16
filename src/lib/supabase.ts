import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseKey)

export type FieldType = 'text' | 'textarea' | 'email' | 'phone' | 'url' | 'company' | 'choice'

export interface FormField {
  id: string
  type: FieldType
  label: string
  placeholder: string
  required: boolean
  choices: string[]
}

export interface StratForm {
  id: string
  title: string
  description: string
  ai_instructions: string
  fields: FormField[]
  published: boolean
  created_at: string
}

export interface FormResponse {
  id: string
  form_id: string
  form_title: string
  response_data: Record<string, string>
  ai_report: string
  respondent_email: string
  created_at: string
}
