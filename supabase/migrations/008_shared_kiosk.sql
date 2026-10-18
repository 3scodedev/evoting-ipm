-- 008 shared kiosk credential: one master password, multi-device sessions
-- Allow duplicate usernames (master kiosk may coexist with legacy rows)
alter table public.kiosks drop constraint if exists kiosks_username_key;

-- Max concurrent sessions per master kiosk
alter table public.election_settings
  add column if not exists kiosk_max_sessions integer not null default 10;

-- Per-device session tracking
create table if not exists public.kiosk_sessions (
  id uuid primary key default gen_random_uuid(),
  kiosk_id uuid not null references public.kiosks(id) on delete cascade,
  device_name text,
  user_agent text,
  ip_address text,
  session_token text not null unique,
  logged_in_at timestamptz not null default now(),
  last_ping timestamptz,
  is_active boolean not null default true
);

alter table public.kiosk_sessions enable row level security;
