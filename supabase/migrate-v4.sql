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
