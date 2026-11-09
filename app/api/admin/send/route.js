import { isAdmin, getAdmin, adminCanAccess, addMessage, emit, userCh, ADMIN_CH, userOnline, pushToUser, SUPPORT, emitToAdmins, getUserById } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const admin = await getAdmin();
  if (!admin) return Response.json({ success: false }, { status: 401 });
  let b = {};
  try { b = await req.json(); } catch {}
  const userId = Number(b.userId);
  const target = await getUserById(userId);
  if (!adminCanAccess(admin, target)) return Response.json({ success: false, error: "Not your user" }, { status: 403 });
  const message = String(b.message || "").trim();
  if (!userId || !message) return Response.json({ success: false, error: "Bad request" }, { status: 400 });

  const online = await userOnline(userId);
  const m = await addMessage(userId, {
    sender: "admin",
    username: "support",
    message,
    reply_to: b.reply_to ?? null,
    image: b.image || null,
    audio_file: b.audio_file || null,
    video_file: b.video_file || null,
    is_delivered: online ? 1 : 0,
  });
  m.is_delivered = online ? 1 : 0;
  emit(userCh(userId), "message", { message: m });
  emitToAdmins(await getUserById(userId), "message", { userId, message: m });
  if (m.is_delivered) {
    emit(userCh(userId), "delivered", { ids: [m.id] });
    emit(ADMIN_CH, "delivered", { userId, ids: [m.id] });
  }
  pushToUser(userId, { title: SUPPORT.display_name, body: message });
  return Response.json({ success: true, message: m });
}
