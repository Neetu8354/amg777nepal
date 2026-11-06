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
alter table sg_users add column if not exists cc text default '91';
alter table sg_users add column if not exists agent_id bigint references sg_agents(id);
create index if not exists sg_users_agent_idx on sg_users (agent_id);

-- admin sessions can belong to an agent (null = main admin)
alter table sg_admin_sessions add column if not exists agent_id bigint references sg_agents(id);

-- per-conversation agent routing: agent-specific channels use "a:<agentId>"
-- (no schema change needed — channels are just strings on the bus)

-- OTP table already exists (sg_otps) — used for first-login verification.
