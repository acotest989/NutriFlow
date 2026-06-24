-- NutriFlow initial schema: per-user food/exercise logs and daily goals.
-- Run this in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query -> Run).
-- Safe to re-run: uses IF NOT EXISTS / DROP POLICY IF EXISTS guards.

-- ============================================================
-- entries: one row per logged meal or exercise
-- ============================================================
create table if not exists public.entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date       date not null,
  type       text not null check (type in ('meal', 'exercise')),
  name       text not null,
  calories   numeric not null default 0,
  protein    numeric not null default 0,
  carbs      numeric not null default 0,
  fat        numeric not null default 0,
  quantity   numeric not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists entries_user_date_idx on public.entries (user_id, date);

alter table public.entries enable row level security;

drop policy if exists "entries_select_own" on public.entries;
create policy "entries_select_own" on public.entries
  for select using (auth.uid() = user_id);

drop policy if exists "entries_insert_own" on public.entries;
create policy "entries_insert_own" on public.entries
  for insert with check (auth.uid() = user_id);

drop policy if exists "entries_update_own" on public.entries;
create policy "entries_update_own" on public.entries
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "entries_delete_own" on public.entries;
create policy "entries_delete_own" on public.entries
  for delete using (auth.uid() = user_id);

-- ============================================================
-- goals: exactly one row per user (daily targets)
-- ============================================================
create table if not exists public.goals (
  user_id    uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  calories   numeric not null default 2000,
  protein    numeric not null default 130,
  carbs      numeric not null default 220,
  fat        numeric not null default 65,
  updated_at timestamptz not null default now()
);

alter table public.goals enable row level security;

drop policy if exists "goals_select_own" on public.goals;
create policy "goals_select_own" on public.goals
  for select using (auth.uid() = user_id);

drop policy if exists "goals_insert_own" on public.goals;
create policy "goals_insert_own" on public.goals
  for insert with check (auth.uid() = user_id);

drop policy if exists "goals_update_own" on public.goals;
create policy "goals_update_own" on public.goals
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
