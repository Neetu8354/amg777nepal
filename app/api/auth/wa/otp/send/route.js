import { otpSend, methods, DEV_OTP_OK } from "@/lib/authx";

export const dynamic = "force-dynamic";

export async function POST(req) {
  if (!methods().waOtp) return Response.json({ success: false, error: "Ye login abhi band hai" }, { status: 403 });
  let b = {};
  try { b = await req.json(); } catch {}
  const mobile = String(b.mobile || "").replace(/\D/g, "");
  if (mobile.length !== 10) return Response.json({ success: false, error: "10-digit mobile daalo" }, { status: 400 });
  const cc = String(b.cc || "91").replace(/\D/g, "").slice(0, 4) || "91";
  const { code, delivered } = await otpSend(`${cc}${mobile}`);
  if (!delivered && !DEV_OTP_OK)
    return Response.json({ success: false, error: "SMS nahi ja paya — thodi der baad try karein" }, { status: 502 });
  // dev_code only in demo/dev — never on production (would bypass OTP entirely)
  return Response.json({ success: true, delivered, dev_code: delivered ? undefined : code });
}
