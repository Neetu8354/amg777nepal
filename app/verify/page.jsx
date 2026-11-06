"use client";

import { useEffect, useState } from "react";
import InstallApp from "@/components/InstallApp";
import { api, deviceId } from "@/lib/client";

const CSS = `
        html, body { color-scheme: dark only; background: #050505 !important; color: #eee !important; }
        .v-page {
          min-height: 100vh; min-height: 100dvh; box-sizing: border-box; padding: 24px 16px calc(24px + env(safe-area-inset-bottom));
          display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px; color-scheme: dark;
          background:
            radial-gradient(ellipse 60% 45% at 50% 0%, rgba(201,146,40,0.32), transparent 70%),
            repeating-linear-gradient(135deg, rgba(255,255,255,0.025) 0 2px, transparent 2px 14px),
            #050505;
          font-family: var(--font-geist-sans, system-ui), -apple-system, 'Segoe UI', sans-serif;
        }
        .v-card {
          width: 100%; max-width: 384px; box-sizing: border-box; background: #000; color: #eee; text-align: center;
          border: 1px solid rgba(234,75,28,0.45); border-radius: 26px; padding: 26px 28px 22px;
          box-shadow: 0 0 60px rgba(201,146,40,0.16), 0 24px 60px rgba(0,0,0,0.6);
        }
        .v-logo { display: block; width: 100%; max-width: 300px; height: auto; object-fit: contain; margin: 0 auto; }
        .v-rule { height: 1px; margin: 14px 0 20px; background: linear-gradient(90deg, transparent, rgba(234,75,28,0.55), transparent); }
        .v-title {
          margin: 0 0 6px; font-size: 21px; font-weight: 700; letter-spacing: 0.2px;
          background: linear-gradient(180deg, #ff9a70, #e13c0e); -webkit-background-clip: text; background-clip: text; color: transparent;
        }
        .v-sub { margin: 0 0 20px; color: #b9b9b9; font-size: 13px; }
        .v-field {
          display: flex; align-items: center; gap: 10px; padding: 7px 12px 7px 8px; border-radius: 12px;
          background: #0c0c0c; border: 1px solid rgba(234,75,28,0.6); transition: border-color .2s, box-shadow .2s;
        }
        .v-field:focus-within { border-color: #ff6b4a; box-shadow: 0 0 0 3px rgba(229,179,80,0.15); }
        .v-sel { border: none; outline: none; cursor: pointer; font-family: inherit; }
        .v-cc { flex-shrink: 0; background: #1e1e1e; color: #ff6b4a; font-weight: 700; font-size: 14px; padding: 7px 9px; border-radius: 8px; }
        .v-input {
          flex: 1; min-width: 0; width: 100%; padding: 8px 0; font-size: 16px; border: 0; outline: none; text-align: left;
          letter-spacing: 0.4px; box-sizing: border-box;
          background: transparent !important; color: #f2f2f2 !important; -webkit-text-fill-color: #f2f2f2 !important; caret-color: #ff6b4a;
        }
        .v-input::placeholder { color: #8a8a8a !important; -webkit-text-fill-color: #8a8a8a !important; opacity: 1; }
        .v-otp { margin-top: 10px; }
        .v-otp .v-input { text-align: center; letter-spacing: 8px; font-weight: 700; font-size: 18px; padding: 8px 4px; }
        .v-btn {
          display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; margin-top: 12px; box-sizing: border-box;
          background: linear-gradient(180deg, #ff6a3d, #e13c0e); color: #fff; border: none; padding: 14px; border-radius: 12px;
          font-size: 15px; font-weight: 700; cursor: pointer; text-decoration: none; font-family: inherit;
          box-shadow: 0 8px 22px rgba(234,75,28,0.35);
        }
        .v-btn:active { transform: scale(0.99); }
        .v-btn:disabled { opacity: 0.6; cursor: wait; }
        .v-btn.ghost { background: transparent; color: #ff6b4a; border: 1px solid rgba(234,75,28,0.5); box-shadow: none; }
        .v-btn.wa { background: linear-gradient(180deg, #17a493, #128c7e); box-shadow: 0 8px 22px rgba(18,140,126,0.3); }
        .v-btn.tg { background: linear-gradient(180deg, #2eaee6, #229ed9); box-shadow: 0 8px 22px rgba(34,158,217,0.3); }
        .v-btn i { font-size: 19px; }
        .v-link { margin-top: 10px; background: none; border: 0; color: #ff6b4a; font-weight: 600; font-size: 14px; cursor: pointer; font-family: inherit; }
        .v-link:disabled { color: #777; cursor: default; }
        .v-or { display: flex; align-items: center; gap: 10px; margin: 16px 0 4px; color: #777; font-size: 12px; text-transform: uppercase; }
        .v-or::before, .v-or::after { content: ""; flex: 1; height: 1px; background: rgba(234,75,28,0.25); }
        .v-msg { font-size: 13px; margin-top: 8px; }
        .v-msg.info { color: #ff8a6e; }
        .v-msg.err { color: #ff6b6b; }
        .v-wait p { color: #ccc; font-size: 14px; margin: 0 0 10px; }
        .v-code {
          font-family: ui-monospace, monospace; font-size: 20px; font-weight: 800; letter-spacing: 2px; color: #ff6b4a;
          background: #0c0c0c; border: 1px solid rgba(234,75,28,0.5); border-radius: 12px; padding: 14px; margin-bottom: 4px; user-select: all;
        }
        .v-small { font-size: 12.5px !important; color: #999 !important; margin-top: 12px !important; }
        .v-trust { display: flex; justify-content: center; flex-wrap: wrap; gap: 6px 18px; margin-top: 16px; color: #b9b9b9; font-size: 11.5px; }
        .v-trust span { display: inline-flex; align-items: center; gap: 6px; }
        .v-trust span::before { content: ""; width: 5px; height: 5px; border-radius: 50%; background: #ff6b4a; }
        .v-install { width: 100%; max-width: 384px; }
        .v-install .ia-card.inline {
          background: #050505; color: #eee; border: 1px solid rgba(234,75,28,0.45); border-radius: 14px;
          padding: 8px 10px; gap: 12px; box-shadow: none;
        }
        .v-install .ia-card.inline .ia-icon { width: 44px; height: 44px; border-radius: 10px; border: 1px solid rgba(234,75,28,0.35); }
        .v-install .ia-card.inline .ia-txt strong { color: #ff6b4a; font-size: 13.5px; }
        .v-install .ia-card.inline .ia-txt span { color: #b9b9b9; font-size: 11.5px; }
        .v-install .ia-card.inline .ia-btn { background: linear-gradient(180deg, #ff6a3d, #e13c0e); border-radius: 10px; padding: 9px 14px; font-size: 13px; }
        .v-install .ia-card.inline .ia-btn.done { background: rgba(234,75,28,0.15); color: #ff8a6e; }
`;

export default function VerifyPage() {
  const [cfg, setCfg] = useState({ plain: true });
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpMode, setOtpMode] = useState("wa"); // "wa" | "signup"
  const [cc, setCc] = useState("91");
  const [resendIn, setResendIn] = useState(0);
  const [wait, setWait] = useState(null); // whatsapp wait card {code, link}
  const [info, setInfo] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [needPw, setNeedPw] = useState(false);
  const [pwMode, setPwMode] = useState("login"); // 'login' | 'register'
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");

  useEffect(() => {
    api("/api/auth/methods").then((r) => r.data && setCfg(r.data));
    api("/api/chat/me").then((r) => {
      if (r.data?.success) window.location.replace("/chat");
    });
  }, []);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  // Poll the WhatsApp-link login until it completes (same as the real app).
  useEffect(() => {
    if (!wait?.state) return;
    const t = setInterval(async () => {
      const r = await api(`/api/auth/wa/status?state=${encodeURIComponent(wait.state)}`, { cache: "no-store" });
      if (r.data?.success) window.location.replace(r.data.redirect || "/chat");
    }, 2000);
    return () => clearInterval(t);
  }, [wait]);

  const sendOtp = async () => {
    if (mobile.length !== 10) return setErr("10-digit mobile daalo");
    setLoading(true);
    setErr("");
    try {
      setOtpMode("wa");
      const r = await api("/api/auth/wa/otp/send", { method: "POST", body: { mobile } });
      if (r.data?.success) {
        setOtpSent(true);
        setResendIn(60);
        setInfo(`WhatsApp par +91 ${mobile} pe code bheja gaya${r.data.dev_code ? ` — demo code: ${r.data.dev_code}` : ""}`);
      } else setErr(r.data?.error || "Code nahi bhej paya");
    } catch {
      setErr("Network error");
    }
    setLoading(false);
  };

  const verifyOtp = async () => {
    if (otp.length !== 6) return setErr("6-digit code daalo");
    setLoading(true);
    setErr("");
    try {
      const r = await api(otpMode === "signup" ? "/api/verify-otp" : "/api/auth/wa/otp/verify", { method: "POST", body: { mobile, cc, otp } });
      if (r.data?.success) window.location.replace(r.data.redirect || "/chat");
      else setErr(r.data?.error || "Code galat hai");
    } catch {
      setErr("Network error");
    }
    setLoading(false);
  };

  const waLogin = async () => {
    if (mobile.length !== 10) return setErr("10-digit mobile daalo");
    setLoading(true);
    setErr("");
    try {
      const r = await api("/api/auth/wa/start", { method: "POST", body: { mobile } });
      if (r.data?.success) {
        setWait({ code: r.data.code, link: r.data.link, state: r.data.state });
        window.open(r.data.link, "_blank");
      } else setErr(r.data?.error || "Login nahi ho paya");
    } catch {
      setErr("Network error");
    }
    setLoading(false);
  };

  const submit = async (withPw = false) => {
    if (mobile.length !== 10) return setErr("10-digit mobile daalo");
    if (withPw || needPw) {
      if (pw.length < 4) return setErr("Password kam se kam 4 characters ka daalo");
      if (pwMode === "register" && pw !== pw2) return setErr("Passwords match nahi karte");
    }
    setLoading(true);
    setErr("");
    setInfo("");
    try {
      const body = { mobile, cc, device_id: deviceId() };
      if (withPw || needPw) body.password = pw;
      const r = await api("/api/verify-mobile", { method: "POST", body });
      const d = r.data;
      if (d?.success && d.otp_required) {
        setOtpMode("signup");
        setOtpSent(true);
        setResendIn(30);
        setInfo(`OTP bheja gaya +${cc} ${mobile} pe${d.dev_code ? ` — demo code: ${d.dev_code}` : ""}`);
        setLoading(false);
        return;
      }
      if (d?.success) {
        window.location.replace(d.redirect || "/chat");
        return;
      }
      if (d?.need_password) {
        setNeedPw(true);
        setPwMode(d.is_new || !d.has_password ? "register" : "login");
        setInfo(d.is_new || !d.has_password ? "Apna password banao" : "Password daalo — bhool gaye ho to admin se reset karwao");
        setLoading(false);
        return;
      }
      setErr(d?.error || "Login nahi ho paya");
    } catch {
      setErr("Network error");
    }
    setLoading(false);
  };

  const tgLogin = async () => {
    setLoading(true);
    const r = await api("/api/auth/telegram/start", { method: "POST" });
    setLoading(false);
    if (r.data?.link) window.open(r.data.link, "_blank");
    else setErr(r.data?.error || "Telegram login abhi available nahi hai");
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="v-page">
        <div className="v-card">
          <img className="v-logo" src="/app/billy-logo.png" alt="Billy777" />
          <div className="v-rule" />
          <h1 className="v-title">Billy777 Customer Support</h1>
          <p className="v-sub">Enter your 10-digit mobile to start chatting</p>
          {wait ? (
            <div className="v-wait">
              <p>
                WhatsApp par ye message <b>Send</b> karein:
              </p>
              <div className="v-code">Login code {wait.code}</div>
              <a className="v-btn wa" href={wait.link} target="_blank" rel="noreferrer">
                <i className="fab fa-whatsapp" /> WhatsApp kholein
              </a>
              <p className="v-small">
                <i className="fas fa-spinner fa-spin" /> Message aate hi aap yahan apne aap login ho jayenge
              </p>
              <button className="v-link" onClick={() => setWait(null)}>
                Cancel
              </button>
            </div>
          ) : (
            <>
              <label className="v-field">
                <select className="v-cc v-sel" value={cc} onChange={(e) => setCc(e.target.value)} disabled={needPw || otpSent}>
                  <option value="91">+91 🇮🇳</option>
                  <option value="92">+92 🇵🇰</option>
                  <option value="977">+977 🇳🇵</option>
                </select>
                <input
                  className="v-input"
                  type="tel"
                  maxLength={10}
                  value={mobile}
                  onChange={(e) => {
                    setMobile(e.target.value.replace(/\D/g, "").slice(0, 10));
                    if (otpSent) setOtpSent(false);
                    if (needPw) { setNeedPw(false); setPw(""); setPw2(""); }
                  }}
                  placeholder="10-digit mobile"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  disabled={needPw || otpSent}
                  onKeyDown={(e) => e.key === "Enter" && (cfg.waOtp && !cfg.plain ? sendOtp() : needPw ? submit(true) : submit())}
                />
              </label>
              {otpSent && (
                <div className="v-field v-otp">
                  <input
                    className="v-input"
                    type="tel"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="6-digit code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && verifyOtp()}
                  />
                </div>
              )}
              {needPw && (
                <>
                  <div className="v-field v-otp" style={{ marginTop: 10 }}>
                    <input
                      className="v-input"
                      type="password"
                      value={pw}
                      onChange={(e) => setPw(e.target.value.slice(0, 64))}
                      placeholder={pwMode === "register" ? "Create password" : "Password"}
                      autoComplete={pwMode === "register" ? "new-password" : "current-password"}
                      autoFocus
                      onKeyDown={(e) => e.key === "Enter" && submit(true)}
                    />
                  </div>
                  {pwMode === "register" && (
                    <div className="v-field v-otp" style={{ marginTop: 10 }}>
                      <input
                        className="v-input"
                        type="password"
                        value={pw2}
                        onChange={(e) => setPw2(e.target.value.slice(0, 64))}
                        placeholder="Confirm password"
                        autoComplete="new-password"
                        onKeyDown={(e) => e.key === "Enter" && submit(true)}
                      />
                    </div>
                  )}
                </>
              )}
              {info && !err && <div className="v-msg info">{info}</div>}
              {err && <div className="v-msg err">{err}</div>}
              {otpSent && !needPw && (
                <>
                  <button className="v-btn" onClick={verifyOtp} disabled={loading}>
                    {loading ? "Please wait..." : "Verify code"}
                  </button>
                  <button className="v-link" onClick={() => { setOtpSent(false); setOtp(""); }} disabled={loading}>
                    Change number
                  </button>
                </>
              )}
              {cfg.waOtp && !needPw && !otpSent && (
                <button className="v-btn" onClick={sendOtp} disabled={loading}>
                  <i className="fab fa-whatsapp" /> {loading ? "Please wait..." : "Login with OTP"}
                </button>
              )}
              {cfg.plain && !otpSent && (
                needPw ? (
                  <>
                    <button className="v-btn" onClick={() => submit(true)} disabled={loading}>
                      <i className="fas fa-key" /> {loading ? "Please wait..." : pwMode === "register" ? "Create password & continue" : "Login with password"}
                    </button>
                    <button className="v-link" disabled={loading} onClick={() => { setNeedPw(false); setPw(""); setPw2(""); }}>
                      Back
                    </button>
                  </>
                ) : (
                  <button className="v-btn" onClick={() => submit(false)} disabled={loading}>
                    {loading ? "Please wait..." : cfg.password ? (cfg.waOtp ? "Login / Register with password" : "Continue without OTP") : "Login / Register"}
                  </button>
                )
              )}
              {cfg.waMsg && (
                <button className="v-btn wa" onClick={waLogin} disabled={loading}>
                  <i className="fab fa-whatsapp" /> Login with WhatsApp
                </button>
              )}
              {cfg.telegram && (
                <>
                  <div className="v-or">or</div>
                  <button className="v-btn tg" onClick={tgLogin} disabled={loading}>
                    <i className="fab fa-telegram" /> Continue with Telegram
                  </button>
                </>
              )}
            </>
          )}
          <div className="v-trust">
            <span>Secure</span>
            <span>24/7 Support</span>
            <span>Instant reply</span>
          </div>
        </div>
        <div className="v-install">
          <InstallApp variant="inline" />
        </div>
      </div>
    </>
  );
}
