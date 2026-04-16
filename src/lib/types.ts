export type FieldType = 'text' | 'textarea' | 'email' | 'phone' | 'url' | 'company' | 'choice' | 'number'

export interface FormField {
  id: string
  type: FieldType
  label: string
  placeholder?: string
  required: boolean
  choices?: string[]
}

export interface Form {
  id: string
  title: string
  description: string
  ai_instructions: string
  fields: FormField[]
  published: boolean
  creator_email: string
  created_at: string
  updated_at: string
}

export interface Submission {
  id: string
  form_id: string
  form_title: string
  responses: Record<string, string>
  ai_report: string
  respondent_email?: string
  respondent_name?: string
  created_at: string
}

export interface CreateFormInput {
  title: string
  description?: string
  ai_instructions?: string
  fields: FormField[]
  published?: boolean
  creator_email: string
}

export interface SubmitFormInput {
  form_id: string
  form_title: string
  responses: Record<string, string>
  respondent_email?: string
  respondent_name?: string
}
