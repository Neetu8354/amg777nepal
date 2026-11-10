import { getUser, getAdmin, addSub, addAdminSub } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req) {
  let sub = null;
  try { sub = await req.json(); } catch {}
  if (!sub?.endpoint) return Response.json({ success: false }, { status: 400 });
  const u = await getUser();
  if (u) { await addSub(u.id, sub); return Response.json({ success: true }); }
  const admin = await getAdmin();
  if (admin) { await addAdminSub(admin, sub); return Response.json({ success: true }); }
  return Response.json({ success: false }, { status: 401 });
}
