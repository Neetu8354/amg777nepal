-- amg777 Customer Support — Supabase schema (serverless-ready)
-- Run once in the Supabase SQL editor. Service-role key bypasses RLS, so
-- simple deny-all policies are fine for a server-only backend.

create table if not exists sg_users (
  id bigint primary key,
  mobile text not null unique,
  username text,
  device_id text,
  display_name text,
  created_at timestamptz default now(),
  blocked boolean default false,
  last_seen timestamptz
);

create table if not exists sg_sessions (
  token text primary key,
  user_id bigint references sg_users(id) on delete cascade
);

create table if not exists sg_admin_sessions (
  token text primary key,
  at timestamptz default now()
);

create table if not exists sg_messages (
  id bigint primary key,
  user_id bigint references sg_users(id) on delete cascade,
  sender text not null,             -- 'user' | 'admin' | 'system'
  username text default '',
  message text default '',
  image text,
  audio_file text,
  video_file text,
  type text default 'text',
  reply_to jsonb,
  link_preview jsonb,
  created_at timestamptz default now(),
  edited_at timestamptz,
  is_delivered int default 0,
  read_at timestamptz
);
create index if not exists sg_messages_user_idx on sg_messages (user_id, id);

create table if not exists sg_subs (
  user_id bigint references sg_users(id) on delete cascade,
  endpoint text not null,
  json jsonb,
  primary key (user_id, endpoint)
);

create table if not exists sg_visits (
  id bigint generated always as identity primary key,
  payload jsonb,
  at timestamptz default now()
);

-- ---------- serverless shared state (replaces in-memory maps) ----------

-- cross-instance id allocation (users + messages share one sequence)
create sequence if not exists sg_seq start with 1000;
create or replace function sg_next_id() returns bigint
language sql security definer set search_path = public
as $$ select nextval('sg_seq') $$;

-- live presence: one row per open SSE connection, heartbeat updates `at`
create table if not exists sg_presence (
  key text primary key,          -- random connection id
  kind text not null,            -- 'user' | 'admin'
  user_id bigint,
  at timestamptz default now()
);
create index if not exists sg_presence_kind_idx on sg_presence (kind, user_id, at);

-- active calls (replaces the in-memory calls map)
create table if not exists sg_calls (
  id text primary key,
  user_id bigint references sg_users(id) on delete cascade,
  initiator text,                -- 'user' | 'admin'
  status text,                   -- ringing | connecting | connected | ended
  created_ms bigint,
  connected_ms bigint,
  meta jsonb
);

-- key/value store for small persistent globals (vapid keys, admin_last_seen)
create table if not exists sg_kv (
  key text primary key,
  value text
);

-- optional-auth ephemeral state (serverless-safe OTP / wa-link login)
create table if not exists sg_otps (
  mobile text primary key,
  code text,
  exp_ms bigint
);
create table if not exists sg_wa (
  state text primary key,
  mobile text,
  code text,
  approve_ms bigint,
  done boolean default false
);

-- Lock down client access; all access goes through the service role key.
alter table sg_users enable row level security;
alter table sg_sessions enable row level security;
alter table sg_admin_sessions enable row level security;
alter table sg_messages enable row level security;
alter table sg_subs enable row level security;
alter table sg_visits enable row level security;
alter table sg_presence enable row level security;
alter table sg_calls enable row level security;
alter table sg_kv enable row level security;
alter table sg_otps enable row level security;
alter table sg_wa enable row level security;

-- Also required (one-time):
--   1. Storage → create a PUBLIC bucket named  sg-media   (or the app creates it lazily)
--   2. Realtime → nothing to enable; broadcast channels work out of the box
