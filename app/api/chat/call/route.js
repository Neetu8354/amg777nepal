import { getUser, userIsBlocked } from "@/lib/db";
import { callAction } from "@/lib/calls";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const u = await getUser();
  if (!u) return Response.json({ success: false, error: "unauthorized" }, { status: 401 });
  if (await userIsBlocked(u)) {
    return Response.json(
      { success: false, error: "You are blocked. Calls are disabled until support unblocks you." },
      { status: 403 }
    );
  }
  let b = {};
  try { b = await req.json(); } catch {}
  return Response.json(await callAction("user", u, b));
}
