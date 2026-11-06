import { isAdmin, getAdmin, adminCanAccess, getUserById } from "@/lib/db";
import { callAction } from "@/lib/calls";

export const dynamic = "force-dynamic";

export async function POST(req) {
  if (!(await isAdmin())) return Response.json({ success: false }, { status: 401 });
  let b = {};
  try { b = await req.json(); } catch {}
  const admin = await getAdmin();
  const uid = Number(b.userId);
  if (uid) { const t = await getUserById(uid); if (!adminCanAccess(admin, t)) return Response.json({ success: false, error: "Not your user" }, { status: 403 }); }
  return Response.json(await callAction("admin", null, b));
}
