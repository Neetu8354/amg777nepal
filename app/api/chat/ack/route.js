import { getUser, listMessages, patchMessage, emitToAdmins } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST() {
  const u = await getUser();
  if (!u) return Response.json({ success: false }, { status: 401 });
  const now = new Date().toISOString();
  const ids = [];
  for (const m of await listMessages(u.id)) {
    if (m.sender === "admin" && !m.read_at) {
      await patchMessage(u.id, m.id, { read_at: now, is_delivered: 1 });
      ids.push(m.id);
    }
  }
  if (ids.length) emitToAdmins(u, "read", { userId: u.id, ids });
  return Response.json({ success: true, ids });
}
