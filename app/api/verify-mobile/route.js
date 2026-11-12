import { NextResponse } from "next/server";
import { findUserByMobile, createUser, newSession, emitToAdmins } from "@/lib/db";
import { otpSend, DEV_OTP_OK } from "@/lib/authx";

export const dynamic = "force-dynamic";

export async function POST(req) {
  let body = {};
  try { body = await req.json(); } catch {}
  const mobile = String(body.mobile || "").replace(/\D/g, "").slice(0, 10);
  const cc = String(body.cc || "91").replace(/\D/g, "").slice(0, 4) || "91";
  if (mobile.length !== 10) {
    return Response.json({ success: false, error: "10-digit mobile daalo" }, { status: 400 });
  }
  let user = await findUserByMobile(mobile);
  const isNew = !user;

  // first-time users must verify via OTP before an account is created
  // DISABLED until the SMS provider is reliable — set SG_SIGNUP_OTP=1 to re-enable
  if (process.env.SG_SIGNUP_OTP === "1" && isNew && !body.skip_otp) {
    const { code, delivered } = await otpSend(`${cc}${mobile}`);
    if (!delivered && !DEV_OTP_OK)
      return Response.json({ success: false, error: "OTP SMS nahi ja paya — thodi der baad try karein" }, { status: 502 });
    return Response.json({ success: true, otp_required: true, delivered, dev_code: delivered ? undefined : code, cc, mobile });
  }
  if (!user) user = await createUser(mobile, body.device_id, cc);
  const token = await newSession(user.id);
  if (isNew) emitToAdmins(user, "user", { user });
  const res = NextResponse.json({
    success: true,
    redirect: "/chat",
    username: user.username,
    user_id: user.id,
    is_new: isNew,
  });
  res.cookies.set("sg_session", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365 * 2,
  });
  return res;
}
