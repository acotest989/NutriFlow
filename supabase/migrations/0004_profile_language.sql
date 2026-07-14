-- Store the user's preferred UI language on their profile so it syncs across
-- devices (the client also keeps it in localStorage for instant/offline use).
-- Run this in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query -> Run).
-- Safe to re-run: uses IF NOT EXISTS.

alter table public.profiles
  add column if not exists language text
    check (language is null or language in ('en', 'sr', 'hr', 'bs'));
