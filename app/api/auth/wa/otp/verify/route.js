import { NextResponse } from "next/server";
import { otpVerify, methods } from "@/lib/authx";
import { findUserByMobile, createUser, newSession, emit, ADMIN_CH } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req) {
  if (!methods().waOtp) return Response.json({ success: false, error: "Ye login abhi band hai" }, { status: 403 });
  let b = {};
  try { b = await req.json(); } catch {}
  const mobile = String(b.mobile || "").replace(/\D/g, "").replace(/^0+/, "");
  const cc = "92";
  const v = await otpVerify(`${cc}${mobile}`, b.otp);
  if (!v.ok) return Response.json({ success: false, error: v.error }, { status: 400 });
  let user = await findUserByMobile(mobile);
  const isNew = !user;
  if (!user) { user = await createUser(mobile, null); emit(ADMIN_CH, "user", { user }); }
  const res = NextResponse.json({ success: true, redirect: "/chat", username: user.username, user_id: user.id });
  res.cookies.set("sg_session", await newSession(user.id), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 63072000 });
  return res;
}
