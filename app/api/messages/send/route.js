import { getUser, addMessage, emit, userCh, ADMIN_CH, userOnline, adminOnline, maybeAutoReply, emitToAdmins, patchMessage, schedule } from "@/lib/db";
import { fetchPreview, firstUrl } from "@/lib/preview";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const u = await getUser();
  if (!u) return Response.json({ success: false, error: "unauthorized" }, { status: 401 });
  if (u.blocked) return Response.json({ success: false, error: "You are blocked." }, { status: 403 });
  let b = {};
  try { b = await req.json(); } catch {}
  const message = String(b.message || "").trim();
  if (!message) return Response.json({ success: false, error: "Empty message" }, { status: 400 });
  if (message.length > 8000) return Response.json({ success: false, error: "Message too long" }, { status: 400 });

  const [adm, online] = await Promise.all([adminOnline(), userOnline(u.id)]);
  const m = await addMessage(u.id, {
    sender: "user",
    username: u.username,
    message,
    reply_to: b.reply_to ?? null,
    is_delivered: adm ? 1 : 0,
  });
  m.is_delivered = adm ? 1 : 0;
  emitToAdmins(u, "message", { userId: u.id, user: pub(u, online), message: m });
  emit(userCh(u.id), "message", { message: m });
  if (adm) emit(userCh(u.id), "delivered", { ids: [m.id] });

  maybeAutoReply(u.id);

  const url = firstUrl(message);
  if (url) {
    schedule(async () => {
      const p = await fetchPreview(url).catch(() => null);
      if (!p) return;
      const mm = await patchMessage(u.id, m.id, { link_preview: p });
      if (mm) {
        emit(userCh(u.id), "edited", { message: mm });
        emit(ADMIN_CH, "edited", { userId: u.id, message: mm });
      }
    }, 0);
  }
  return Response.json({ success: true, message: m });
}

function pub(u, online) {
  return { id: u.id, mobile: u.mobile, username: u.username, display_name: u.display_name, online };
}
