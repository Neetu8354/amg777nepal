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
