import crypto from "crypto";
import { findUserByMobile, createUser, newSession, sendWelcome } from "@/lib/db";
import { remote, remoteOn } from "@/lib/remote";

/* Optional login methods — enabled via env flags to mirror the live site's
   /api/auth/methods response. WhatsApp/Telegram are simulated locally:
   OTP codes and the magic-link flow work end-to-end without external APIs.
   State lives in sg_otps/sg_wa on serverless, in-memory maps locally. */

const g = globalThis;
if (!g.__sgOtps) g.__sgOtps = new Map();   // mobile -> { code, exp }
if (!g.__sgWaStates) g.__sgWaStates = new Map(); // state -> { mobile, code, approveAt, done }

export function methods() {
  return {
    plain: process.env.SG_AUTH_PLAIN !== "0",
    password: process.env.SG_AUTH_PASSWORD === "1",
    waOtp: process.env.SG_AUTH_WAOTP === "1",
    waMsg: process.env.SG_AUTH_WAMSG === "1",
    telegram: process.env.SG_AUTH_TELEGRAM === "1",
  };
}

/* Laaffic SMS — env: LAAFFIC_APP_ID, LAAFFIC_API_KEY, LAAFFIC_API_SECRET,
   LAAFFIC_SENDER_ID (optional). Sign = md5(apiKey + apiSecret + timestamp). */
const LAAFFIC_ON = !!(
  process.env.LAAFFIC_APP_ID && process.env.LAAFFIC_API_KEY && process.env.LAAFFIC_API_SECRET
);

/* dev_code fallback — demo only. Never expose the OTP in production: if SMS
   delivery fails on Vercel, returning it would let anyone log in as anyone. */
export const DEV_OTP_OK = process.env.SG_DEV_OTP === "1" || !process.env.VERCEL;

async function sendSmsOtp(mobile, code) {
  if (!LAAFFIC_ON) return false;
  const ts = String(Math.floor(Date.now() / 1000));
  const sign = crypto
    .createHash("md5")
    .update(process.env.LAAFFIC_API_KEY + process.env.LAAFFIC_API_SECRET + ts)
    .digest("hex");
  try {
    const r = await fetch("https://api.laaffic.com/v3/sendSms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
        Sign: sign,
        Timestamp: ts,
        "Api-Key": process.env.LAAFFIC_API_KEY,
      },
      body: JSON.stringify({
        appId: process.env.LAAFFIC_APP_ID,
        numbers: mobile,
        content: `Your Billy777 verification code is ${code}. Valid for 5 minutes.`,
        senderId: process.env.LAAFFIC_SENDER_ID || undefined,
        trackClicks: 0,
      }),
    });
    const d = await r.json().catch(() => null);
    if (d && String(d.status) === "0") return true;
    console.error("[laaffic] send failed:", JSON.stringify(d).slice(0, 200));
    return false;
  } catch (e) {
    console.error("[laaffic] send error:", e?.message || e);
    return false;
  }
}

export async function otpSend(mobile) {
  const code = String(crypto.randomInt(100000, 999999));
  if (remoteOn) await remote.otpSet(mobile, code, Date.now() + 5 * 60 * 1000);
  else g.__sgOtps.set(mobile, { code, exp: Date.now() + 5 * 60 * 1000 });
  const delivered = await sendSmsOtp(mobile, code);
  return { code, delivered };
}

export async function otpVerify(mobile, code) {
  const rec = remoteOn ? await remote.otpGet(mobile) : g.__sgOtps.get(mobile);
  const exp = remoteOn ? rec?.exp_ms : rec?.exp;
  if (!rec || exp < Date.now()) return { ok: false, error: "Code expire ho gaya, dobara try karein" };
  if (rec.code !== String(code)) return { ok: false, error: "Code galat hai" };
  if (remoteOn) remote.otpDel(mobile);
  else g.__sgOtps.delete(mobile);
  return { ok: true };
}

export async function waStart(mobile) {
  const state = crypto.randomBytes(10).toString("hex");
  const code = String(crypto.randomInt(1000, 9999));
  const rec = { mobile, code, approveAt: Date.now() + 9000, done: false };
  if (remoteOn) await remote.waSet(state, rec);
  else g.__sgWaStates.set(state, rec);
  const link = `https://wa.me/?text=${encodeURIComponent(`Login code ${code}`)}`;
  return { state, code, link };
}

export async function waStatus(state) {
  const s = remoteOn ? await remote.waGet(state) : g.__sgWaStates.get(state);
  if (!s) return { state: "expired" };
  if (!s.done && Date.now() < s.approveAt) return { state: "pending" };
  s.done = true;
  if (remoteOn) await remote.waSet(state, s);
  let user = await findUserByMobile(s.mobile);
  if (!user) {
    user = await createUser(s.mobile, null);
    sendWelcome(user.id);
  }
  const token = await newSession(user.id);
  return { state: "ok", token, user };
}
