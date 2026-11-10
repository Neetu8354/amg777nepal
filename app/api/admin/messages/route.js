import { isAdmin, getAdmin, adminCanAccess, listMessages, patchMessage, emit, userCh, userOnline, getUserById, emitToAdmins } from "@/lib/db";
import { remote, remoteOn } from "@/lib/remote";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const admin = await getAdmin();
  if (!admin) return Response.json({ success: false }, { status: 401 });
  const userId = Number(new URL(req.url).searchParams.get("u"));
  const user = await getUserById(userId);
  if (!user) return Response.json({ success: false, error: "User not found" }, { status: 404 });
  if (!adminCanAccess(admin, user)) return Response.json({ success: false, error: "Not your user" }, { status: 403 });

  const now = new Date().toISOString();
  const [readIds, messages, online] = await Promise.all([
    remoteOn
      ? remote.markRead(userId, "user")
      : (async () => {
          const ids = [];
          for (const m of await listMessages(userId)) {
            if (m.sender === "user" && !m.read_at) {
              await patchMessage(userId, m.id, { read_at: now });
              ids.push(m.id);
            }
          }
          return ids;
        })(),
    listMessages(userId),
    userOnline(userId),
  ]);
  if (readIds.length) emit(userCh(userId), "read", { ids: readIds });
  if (readIds.length) emitToAdmins(user, "read", { userId, ids: readIds });

  return Response.json({
    success: true,
    messages,
    user: {
      id: user.id, mobile: user.mobile, username: user.username,
      display_name: user.display_name, blocked: !!user.blocked,
      online, last_seen: user.last_seen,
    },
  });
}
