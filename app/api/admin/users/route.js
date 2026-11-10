import { isAdmin, getAdmin, db, allMessages, onlineUserIds } from "@/lib/db";
import { remote, remoteOn } from "@/lib/remote";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getAdmin();
  if (!admin) return Response.json({ success: false }, { status: 401 });

  const [usersAll, stats, online] = await Promise.all([
    remoteOn ? remote.usersAll() : Promise.resolve(Object.values(db.users)),
    remoteOn ? remote.userStats() : Promise.resolve(null),
    onlineUserIds(),
  ]);
  // only pay the full-table cost when the sg_user_stats rpc isn't installed
  const msgs = stats ? null : await allMessages();

  // fallback when the sg_user_stats rpc isn't installed yet
  const byUser = new Map();
  if (!stats) {
    for (const m of msgs || []) {
      const uid = m.user_id;
      if (!byUser.has(uid)) byUser.set(uid, []);
      byUser.get(uid).push(m);
    }
  }

  let users = usersAll;
  if (!admin.main) users = users.filter((u) => u.agent_id === admin.agent?.id);
  const out = users
    .map((u) => {
      const st = stats?.get(u.id);
      const list = st ? null : byUser.get(u.id) || [];
      return {
        id: u.id,
        mobile: u.mobile,
        username: u.username,
        display_name: u.display_name,
        blocked: !!u.blocked,
        online: online.has(u.id),
        last_seen: u.last_seen,
        created_at: u.created_at,
        unread: st ? st.unread : list.filter((m) => m.sender === "user" && !m.read_at).length,
        last_message: st ? st.last : list[list.length - 1] || null,
      };
    })
    .sort((a, b) => {
      const ta = a.last_message?.created_at || a.created_at;
      const tb = b.last_message?.created_at || b.created_at;
      return String(tb).localeCompare(String(ta));
    });
  return Response.json({ success: true, users: out });
}
