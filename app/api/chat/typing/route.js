import { getUser, emitToAdmins } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const u = await getUser();
  if (!u) return Response.json({ success: false }, { status: 401 });
  let b = {};
  try { b = await req.json(); } catch {}
  emitToAdmins(u, "typing", { userId: u.id, username: u.username, is_typing: !!b.is_typing });
  return Response.json({ success: true });
}
