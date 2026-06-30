-- NutriFlow user profiles: onboarding answers used to personalize goals.
-- Run this in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query -> Run).
-- Safe to re-run: uses IF NOT EXISTS / DROP POLICY IF EXISTS guards.

-- ============================================================
-- profiles: exactly one row per user (first-run onboarding data)
-- Body measurements are stored in METRIC (cm / kg); `units` is display-only.
-- ============================================================
create table if not exists public.profiles (
  user_id          uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  has_onboarded    boolean not null default false,
  goal_type        text    check (goal_type in ('lose', 'maintain', 'gain', 'build_muscle')),
  sex              text    check (sex in ('male', 'female', 'other')),
  age              integer,
  height_cm        numeric,
  weight_kg        numeric,
  target_weight_kg numeric,
  activity         text    check (activity in ('sedentary', 'light', 'moderate', 'very', 'extra')),
  diet             text,
  restrictions     text[]  not null default '{}',
  workouts         text[]  not null default '{}',
  units            text    not null default 'metric' check (units in ('metric', 'imperial')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = user_id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = user_id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
