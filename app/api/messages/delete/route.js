import { getUser, deleteMessage, emitToAdmins, userCh } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const u = await getUser();
  if (!u) return Response.json({ success: false }, { status: 401 });
  let b = {};
  try { b = await req.json(); } catch {}
  const id = Number(b.id);
  const m = await deleteMessage(u.id, id);
  if (!m) return Response.json({ success: false, error: "Not found" }, { status: 404 });
  emit(userCh(u.id), "deleted", { id });
  emitToAdmins(u, "deleted", { userId: u.id, id });
  return Response.json({ success: true });
}
