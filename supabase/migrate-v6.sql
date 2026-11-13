-- Migration v6 — message ids from the column default.
-- Run in the Supabase SQL editor after migrate-v5.sql.
-- Lets the app insert sg_messages in ONE request (skips the sg_next_id rpc).
-- Until this runs, the app auto-falls back to the rpc — safe to apply anytime.

alter table sg_messages alter column id set default nextval('sg_seq');
