import { NextResponse } from "next/server";
import { ADMIN_USER, ADMIN_PASS, newAdminSession } from "@/lib/db";
import { agentLogin } from "@/lib/agents";

export const dynamic = "force-dynamic";

export async function POST(req) {
  let b = {};
  try { b = await req.json(); } catch {}
  const username = String(b.username || "");
  const password = String(b.password || "");

  let token = null;
  let role = null;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    token = await newAdminSession(null); // main admin
    role = "main";
  } else {
    const agent = await agentLogin(username, password);
    if (agent) {
      token = await newAdminSession(agent.id);
      role = "agent";
    }
  }
  if (!token) return Response.json({ success: false, error: "Invalid credentials" }, { status: 401 });
  const res = NextResponse.json({ success: true, role });
  res.cookies.set("sg_admin", token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return res;
}
