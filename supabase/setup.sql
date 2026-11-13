-- ===========================================================
-- amg777pak — FRESH PROJECT SETUP (Pakistan site)
-- Run ONCE in the Supabase SQL editor for a new project.
-- = schema.sql + migrate-v2..v6 combined (all idempotent).
-- ===========================================================

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

-- ---- migrate-v2 ----
-- Migration for existing installs (schema v1 -> v2, serverless-ready).
-- Run in the Supabase SQL editor AFTER schema.sql was previously run.

-- reply_to stores the quote object {id, message, username}, not just an id
alter table sg_messages alter column reply_to type jsonb
  using case when reply_to is null then null else to_jsonb(reply_to) end;

-- shared id sequence (users + messages), seeded above existing rows
create sequence if not exists sg_seq;
select setval('sg_seq', greatest(
  1000,
  coalesce((select max(id) from sg_users), 0) + 1,
  coalesce((select max(id) from sg_messages), 0) + 1
));
create or replace function sg_next_id() returns bigint
language sql security definer set search_path = public
as $$ select nextval('sg_seq') $$;

create table if not exists sg_presence (
  key text primary key,
  kind text not null,
  user_id bigint,
  at timestamptz default now()
);
create index if not exists sg_presence_kind_idx on sg_presence (kind, user_id, at);

create table if not exists sg_calls (
  id text primary key,
  user_id bigint references sg_users(id) on delete cascade,
  initiator text,
  status text,
  created_ms bigint,
  connected_ms bigint,
  meta jsonb
);

create table if not exists sg_kv (
  key text primary key,
  value text
);

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

alter table sg_presence enable row level security;
alter table sg_calls enable row level security;
alter table sg_kv enable row level security;
alter table sg_otps enable row level security;
alter table sg_wa enable row level security;

-- media bucket for uploads (public)
insert into storage.buckets (id, name, public)
values ('sg-media', 'sg-media', true)
on conflict (id) do nothing;

-- ---- migrate-v3 ----
-- Migration v3 — multi-agent support + country-code routing.
-- Run in the Supabase SQL editor after migrate-v2.sql.

-- agents: support staff accounts created by the main admin
create table if not exists sg_agents (
  id bigint primary key,
  username text not null unique,
  pass_hash text not null,
  name text not null,
  prefixes text[] default '{}',      -- e.g. {'91','92','977'} country dial codes
  is_default boolean default false,  -- catches users whose cc matches no prefix
  active boolean default true,
  created_at timestamptz default now()
);
alter table sg_agents enable row level security;

-- users get a country code + assigned agent
alter table sg_users add column if not exists cc text default '92';
alter table sg_users add column if not exists agent_id bigint references sg_agents(id);
create index if not exists sg_users_agent_idx on sg_users (agent_id);

-- admin sessions can belong to an agent (null = main admin)
alter table sg_admin_sessions add column if not exists agent_id bigint references sg_agents(id);

-- per-conversation agent routing: agent-specific channels use "a:<agentId>"
-- (no schema change needed — channels are just strings on the bus)

-- OTP table already exists (sg_otps) — used for first-login verification.

-- ---- migrate-v4 ----
-- Migration v4 — admin push subscriptions (call alerts for agents/main admin).
-- Run in the Supabase SQL editor after migrate-v3.sql.

-- web-push subscriptions for support staff. agent_id null = main admin, who
-- receives alerts for every user; an agent's subs only get their users' calls.
create table if not exists sg_admin_subs (
  endpoint text primary key,
  agent_id bigint references sg_agents(id) on delete cascade,
  json jsonb
);
alter table sg_admin_subs enable row level security;

-- ---- migrate-v5 ----
-- Migration v5 — fast per-user chat stats for the admin console.
-- Run in the Supabase SQL editor after migrate-v4.sql.
-- Replaces fetching the whole sg_messages table on every /api/admin/users load.

create or replace function sg_user_stats()
returns table(user_id bigint, unread bigint, last jsonb)
language sql stable security definer as $$
  select
    m.user_id,
    count(*) filter (where m.sender = 'user' and m.read_at is null) as unread,
    (
      select row_to_json(x) from (
        select * from sg_messages x
        where x.user_id = m.user_id
        order by x.id desc
        limit 1
      ) x
    ) as last
  from sg_messages m
  group by m.user_id;
$$;

-- helps the group-by + the batched read-marking updates
create index if not exists sg_messages_unread_idx
  on sg_messages (user_id, sender, read_at);

-- ---- migrate-v6 ----
-- Migration v6 — message ids from the column default.
-- Run in the Supabase SQL editor after migrate-v5.sql.
-- Lets the app insert sg_messages in ONE request (skips the sg_next_id rpc).
-- Until this runs, the app auto-falls back to the rpc — safe to apply anytime.

alter table sg_messages alter column id set default nextval('sg_seq');
