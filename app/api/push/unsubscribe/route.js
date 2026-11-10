import { getUser, getAdmin, removeSub, removeAdminSub } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req) {
  let sub = null;
  try { sub = await req.json(); } catch {}
  if (!sub?.endpoint) return Response.json({ success: false }, { status: 400 });
  const u = await getUser();
  if (u) { await removeSub(u.id, sub.endpoint); return Response.json({ success: true }); }
  const admin = await getAdmin();
  if (admin) { await removeAdminSub(sub.endpoint); return Response.json({ success: true }); }
  return Response.json({ success: false }, { status: 401 });
}
