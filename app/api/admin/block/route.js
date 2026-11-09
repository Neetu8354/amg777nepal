import { isAdmin, getAdmin, adminCanAccess, getUserById, emit, emitToAdmins, userCh, invalidateUserSessions } from "@/lib/db";
import { remote, remoteOn } from "@/lib/remote";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const _a = await isAdmin(); if (!_a) return Response.json({ success: false }, { status: 401 });
  let b = {};
  try { b = await req.json(); } catch {}
  const userId = Number(b.userId);
  const u = await getUserById(userId);
  if (!u) return Response.json({ success: false }, { status: 404 });
  const admin = await getAdmin();
  if (!adminCanAccess(admin, u)) return Response.json({ success: false, error: "Not your user" }, { status: 403 });
  u.blocked = !!b.blocked;
  if (remoteOn) await remote.patchUser(userId, { blocked: u.blocked });
  else { const { db, save } = await import("@/lib/db"); db.users[userId] = u; save(); }
  invalidateUserSessions(userId);
  emit(userCh(userId), "blocked", { blocked: u.blocked });
  emitToAdmins(u, "blocked", { userId, blocked: u.blocked });
  return Response.json({ success: true });
}
