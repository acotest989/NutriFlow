-- NutriFlow hydration tracking: one row per user per day.
-- Run this in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query -> Run).
-- Safe to re-run.

create table if not exists public.hydration (
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date        date not null,
  consumed_ml numeric not null default 0,
  updated_at  timestamptz not null default now(),
  primary key (user_id, date)
);

alter table public.hydration enable row level security;

drop policy if exists "hydration_select_own" on public.hydration;
create policy "hydration_select_own" on public.hydration
  for select using (auth.uid() = user_id);

drop policy if exists "hydration_insert_own" on public.hydration;
create policy "hydration_insert_own" on public.hydration
  for insert with check (auth.uid() = user_id);

drop policy if exists "hydration_update_own" on public.hydration;
create policy "hydration_update_own" on public.hydration
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
