import { NextResponse } from "next/server";
import { createUser, newSession, emitToAdmins } from "@/lib/db";
import { otpVerify, ccDigits } from "@/lib/authx";

export const dynamic = "force-dynamic";

export async function POST(req) {
  let b = {};
  try { b = await req.json(); } catch {}
  const mobile = String(b.mobile || "").replace(/\D/g, "").replace(/^0+/, "").slice(0, 10);
  const cc = "91";
  if (mobile.length !== ccDigits(cc)) return Response.json({ success: false, error: `${ccDigits(cc)}-digit mobile daalo` }, { status: 400 });

  const v = await otpVerify(`${cc}${mobile}`, b.otp);
  if (!v.ok) return Response.json({ success: false, error: v.error }, { status: 400 });

  const user = await createUser(mobile, b.device_id, cc);
  emitToAdmins(user, "user", { user });
  const res = NextResponse.json({
    success: true,
    redirect: "/chat",
    username: user.username,
    user_id: user.id,
    is_new: true,
  });
  res.cookies.set("sg_session", await newSession(user.id), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365 * 2,
  });
  return res;
}
