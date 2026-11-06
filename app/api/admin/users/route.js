import { isAdmin, getAdmin, db, allMessages, onlineUserIds } from "@/lib/db";
import { remote, remoteOn } from "@/lib/remote";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getAdmin();
  if (!admin) return Response.json({ success: false }, { status: 401 });
  let users = remoteOn ? await remote.usersAll() : Object.values(db.users);
  if (!admin.main) users = users.filter((u) => u.agent_id === admin.agent?.id);
  const msgs = await allMessages();
  const online = await onlineUserIds();
  const byUser = new Map();
  for (const m of msgs) {
    const uid = m.user_id;
    if (!byUser.has(uid)) byUser.set(uid, []);
    byUser.get(uid).push(m);
  }
  const out = users
    .map((u) => {
      const list = byUser.get(u.id) || [];
      return {
        id: u.id,
        mobile: u.mobile,
        username: u.username,
        display_name: u.display_name,
        blocked: !!u.blocked,
        online: online.has(u.id),
        last_seen: u.last_seen,
        created_at: u.created_at,
        unread: list.filter((m) => m.sender === "user" && !m.read_at).length,
        last_message: list[list.length - 1] || null,
      };
    })
    .sort((a, b) => {
      const ta = a.last_message?.created_at || a.created_at;
      const tb = b.last_message?.created_at || b.created_at;
      return String(tb).localeCompare(String(ta));
    });
  return Response.json({ success: true, users: out });
}
