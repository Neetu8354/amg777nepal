import path from "path";
import crypto from "crypto";
import { getUser, userIsBlocked, addMessage, emit, userCh, ADMIN_CH, userOnline, adminOnline, maybeAutoReply, emitToAdmins } from "@/lib/db";
import { storeUpload } from "@/lib/media";

export const dynamic = "force-dynamic";

const LIMITS = { image: 5 * 1024 * 1024, video: 50 * 1024 * 1024, audio: 15 * 1024 * 1024 };
const EXT = {
  "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif",
  "video/mp4": ".mp4", "video/webm": ".webm", "video/quicktime": ".mov",
  "audio/webm": ".webm", "audio/ogg": ".ogg", "audio/mpeg": ".mp3", "audio/mp4": ".m4a", "audio/wav": ".wav",
};

export async function POST(req) {
  const u = await getUser();
  if (!u) return Response.json({ success: false, error: "unauthorized" }, { status: 401 });
  if (await userIsBlocked(u)) return Response.json({ success: false, error: "You are blocked." }, { status: 403 });
  const fd = await req.formData();
  const file = fd.get("file");
  const kind = String(fd.get("kind") || "image");
  const caption = String(fd.get("caption") || "").trim();
  if (!file || typeof file.arrayBuffer !== "function") {
    return Response.json({ success: false, error: "No file" }, { status: 400 });
  }
  if (file.size > (LIMITS[kind] || LIMITS.image)) {
    return Response.json({ success: false, error: "File too large" }, { status: 400 });
  }
  const ext = EXT[file.type] || path.extname(file.name || "").toLowerCase() || ".bin";
  const name = crypto.randomBytes(12).toString("hex") + ext;
  const url = await storeUpload(name, Buffer.from(await file.arrayBuffer()), file.type || "application/octet-stream");
  if (!url) return Response.json({ success: false, error: "Upload failed" }, { status: 500 });

  const [adm, online] = await Promise.all([adminOnline(), userOnline(u.id)]);
  const m = await addMessage(u.id, {
    sender: "user",
    username: u.username,
    message: caption,
    image: kind === "image" ? url : null,
    video_file: kind === "video" ? url : null,
    audio_file: kind === "audio" ? url : null,
    reply_to: fd.get("reply_to") ? JSON.parse(fd.get("reply_to")) : null,
    is_delivered: adm ? 1 : 0,
  });
  m.is_delivered = adm ? 1 : 0;
  emitToAdmins(u, "message", { userId: u.id, user: { id: u.id, mobile: u.mobile, username: u.username, display_name: u.display_name, online }, message: m });
  emit(userCh(u.id), "message", { message: m });
  if (adm) emit(userCh(u.id), "delivered", { ids: [m.id] });
  maybeAutoReply(u.id);
  return Response.json({ success: true, message: m });
}
