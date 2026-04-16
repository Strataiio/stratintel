-- StratIntel Database Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Forms table
create table if not exists forms (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text default '',
  ai_instructions text default '',
  fields jsonb not null default '[]',
  published boolean default false,
  creator_email text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Submissions table
create table if not exists submissions (
  id uuid primary key default uuid_generate_v4(),
  form_id uuid references forms(id) on delete cascade,
  form_title text not null,
  responses jsonb not null default '{}',
  ai_report text not null default '',
  respondent_email text,
  respondent_name text,
  created_at timestamptz default now()
);

-- Indexes
create index if not exists idx_forms_creator on forms(creator_email);
create index if not exists idx_submissions_form_id on submissions(form_id);
create index if not exists idx_submissions_created_at on submissions(created_at desc);

-- RLS Policies
alter table forms enable row level security;
alter table submissions enable row level security;

-- Forms: creators manage their own forms
create policy "Anyone can read published forms" on forms
  for select using (published = true);

create policy "Service role full access to forms" on forms
  using (true) with check (true);

-- Submissions: anyone can insert, service role can read all
create policy "Anyone can submit to published forms" on submissions
  for insert with check (true);

create policy "Service role full access to submissions" on submissions
  using (true) with check (true);

-- Updated_at trigger
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger forms_updated_at
  before update on forms
  for each row execute function update_updated_at();
