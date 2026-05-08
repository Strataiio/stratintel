-- StratIntel Database Schema
-- Run this entire block in your Supabase SQL Editor

-- Forms table
create table if not exists strat_forms (
  id text primary key,
  title text default '',
  description text default '',
  ai_instructions text default '',
  fields jsonb default '[]',
  published boolean default false,
  created_at timestamptz default now()
);

-- Responses table
create table if not exists strat_responses (
  id uuid primary key default gen_random_uuid(),
  form_id text references strat_forms(id) on delete cascade,
  form_title text,
  response_data jsonb,
  ai_report text,
  respondent_email text,
  created_at timestamptz default now()
);

-- Indexes for performance
create index if not exists idx_strat_forms_published on strat_forms(published);
create index if not exists idx_strat_responses_form_id on strat_responses(form_id);
create index if not exists idx_strat_responses_created_at on strat_responses(created_at desc);

-- Row Level Security
alter table strat_forms enable row level security;
alter table strat_responses enable row level security;

-- Policies: open access (add auth later if needed)
create policy "allow_all_forms" on strat_forms for all using (true) with check (true);
create policy "allow_all_responses" on strat_responses for all using (true) with check (true);
