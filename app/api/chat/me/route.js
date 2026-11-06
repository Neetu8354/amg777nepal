import { getUser, SUPPORT, adminOnline, adminLastSeen } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const u = await getUser();
  if (!u) return Response.json({ success: false }, { status: 401 });
  const [admin_online, admin_last_seen] = await Promise.all([adminOnline(), adminLastSeen()]);
  return Response.json({
    success: true,
    username: u.username,
    user_id: u.id,
    mobile: u.mobile,
    blocked: !!u.blocked,
    support: SUPPORT,
    admin_online,
    admin_last_seen,
  });
}
