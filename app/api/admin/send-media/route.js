import path from "path";
import crypto from "crypto";
import { isAdmin, getAdmin, adminCanAccess, getUserById, addMessage, emit, userCh, ADMIN_CH, userOnline, emitToAdmins, getUserById } from "@/lib/db";
import { storeUpload } from "@/lib/media";

export const dynamic = "force-dynamic";

const LIMITS = { image: 5 * 1024 * 1024, video: 50 * 1024 * 1024, audio: 15 * 1024 * 1024 };
const EXT = {
  "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif",
  "video/mp4": ".mp4", "video/webm": ".webm", "video/quicktime": ".mov",
  "audio/webm": ".webm", "audio/ogg": ".ogg", "audio/mpeg": ".mp3", "audio/mp4": ".m4a", "audio/wav": ".wav",
};

export async function POST(req) {
  if (!(await isAdmin())) return Response.json({ success: false }, { status: 401 });
  const fd = await req.formData();
  const file = fd.get("file");
  const kind = String(fd.get("kind") || "image");
  const userId = Number(fd.get("userId"));
  const admin = await getAdmin();
  const target = await getUserById(userId);
  if (!admin || !adminCanAccess(admin, target)) return Response.json({ success: false, error: "Not your user" }, { status: 403 });
  const caption = String(fd.get("caption") || "").trim();
  if (!file || typeof file.arrayBuffer !== "function" || !userId) {
    return Response.json({ success: false, error: "Bad request" }, { status: 400 });
  }
  if (file.size > (LIMITS[kind] || LIMITS.image)) {
    return Response.json({ success: false, error: "File too large" }, { status: 400 });
  }
  const ext = EXT[file.type] || path.extname(file.name || "").toLowerCase() || ".bin";
  const name = crypto.randomBytes(12).toString("hex") + ext;
  const url = await storeUpload(name, Buffer.from(await file.arrayBuffer()), file.type || "application/octet-stream");
  if (!url) return Response.json({ success: false, error: "Upload failed" }, { status: 500 });

  const online = await userOnline(userId);
  const m = await addMessage(userId, {
    sender: "admin",
    username: "support",
    message: caption,
    image: kind === "image" ? url : null,
    video_file: kind === "video" ? url : null,
    audio_file: kind === "audio" ? url : null,
    reply_to: fd.get("reply_to") ? JSON.parse(fd.get("reply_to")) : null,
    is_delivered: online ? 1 : 0,
  });
  m.is_delivered = online ? 1 : 0;
  emit(userCh(userId), "message", { message: m });
  emitToAdmins(await getUserById(userId), "message", { userId, message: m });
  return Response.json({ success: true, message: m });
}
