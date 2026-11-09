import { getUser, patchMessage, emit, emitToAdmins, userCh } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const u = await getUser();
  if (!u) return Response.json({ success: false }, { status: 401 });
  let b = {};
  try { b = await req.json(); } catch {}
  const id = Number(b.id), message = String(b.message || "").trim();
  if (!id || !message) return Response.json({ success: false, error: "Bad request" }, { status: 400 });
  const m = await patchMessage(u.id, id, { message, edited_at: new Date().toISOString() });
  if (!m || m.sender !== "user") return Response.json({ success: false, error: "Not found" }, { status: 404 });
  emit(userCh(u.id), "edited", { message: m });
  emitToAdmins(u, "edited", { userId: u.id, message: m });
  return Response.json({ success: true, message: m });
}
