import { getUser, listMessages, SUPPORT, adminOnline, adminLastSeen } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const u = await getUser();
  if (!u) return Response.json({ success: false }, { status: 401 });
  const [messages, admin_online, admin_last_seen] = await Promise.all([
    listMessages(u.id),
    adminOnline(),
    adminLastSeen(),
  ]);
  return Response.json({
    success: true,
    username: u.username,
    user_id: u.id,
    blocked: !!u.blocked,
    messages,
    support: SUPPORT,
    admin_online,
    admin_last_seen,
  });
}
