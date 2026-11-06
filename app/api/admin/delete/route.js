import { isAdmin, getAdmin, adminCanAccess, deleteMessage, emitToAdmins, userCh, getUserById } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req) {
  if (!(await isAdmin())) return Response.json({ success: false }, { status: 401 });
  let b = {};
  try { b = await req.json(); } catch {}
  const userId = Number(b.userId), id = Number(b.id);
  const admin = await getAdmin();
  const tU = await getUserById(userId);
  if (!adminCanAccess(admin, tU)) return Response.json({ success: false, error: "Not your user" }, { status: 403 });
  const m = await deleteMessage(userId, id);
  if (!m) return Response.json({ success: false }, { status: 404 });
  emit(userCh(userId), "deleted", { id });
  const u = await getUserById(userId); emitToAdmins(u, "deleted", { userId, id });
  return Response.json({ success: true });
}
