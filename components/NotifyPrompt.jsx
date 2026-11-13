"use client";

import { useCallback, useEffect, useState } from "react";
import { subscribePush } from "@/lib/client";

const NG_CSS = `
.ng-back { position:fixed; inset:0; z-index:40000; background:rgba(70,70,70,.55); display:flex; align-items:center; justify-content:center;
  padding:24px 16px; font-family:system-ui,-apple-system,'Segoe UI',sans-serif; }
.ng-card { background:#fff; color:#111b21; width:100%; max-width:360px; border-radius:18px; padding:28px 22px 20px; text-align:center;
  box-shadow:0 18px 50px rgba(0,0,0,.28); }
.ng-hero { position:relative; width:74px; height:74px; margin:0 auto 16px; }
.ng-mark { width:74px; height:74px; display:block; border-radius:18px; }
.ng-badge { position:absolute; right:-4px; bottom:-4px; width:28px; height:28px; border-radius:50%; background:#fff;
  box-shadow:0 2px 6px rgba(0,0,0,.18); display:flex; align-items:center; justify-content:center; }
.ng-badge svg { width:16px; height:16px; display:block; }
.ng-card h1 { font-size:20px; line-height:1.3; font-weight:700; margin:0 0 8px; color:#111; }
.ng-text { font-size:14px; line-height:1.45; color:#667781; margin:0 auto 16px; max-width:300px; }
.ng-points { list-style:none; margin:0 auto 18px; padding:0; text-align:left; width:max-content; max-width:100%; }
.ng-points li { display:flex; align-items:center; gap:8px; font-size:14px; color:#3b4a54; padding:7px 0; border-bottom:1px solid #f0f2f5; }
.ng-points li:last-child { border-bottom:0; }
.ng-points li::before { content:""; width:18px; height:18px; border-radius:50%; background:#ff5a2e; flex-shrink:0;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='white' d='M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z'/></svg>");
  background-size:12px; background-repeat:no-repeat; background-position:center; }
.ng-steps { list-style:none; margin:0 0 16px; padding:0; text-align:left; display:flex; flex-direction:column; gap:10px; }
.ng-steps li { display:flex; gap:10px; align-items:flex-start; font-size:14px; line-height:1.45; color:#3b4a54; }
.ng-steps li::before { counter-increment:ng; content:counter(ng); width:22px; height:22px; border-radius:50%; background:#ff5a2e; color:#fff;
  font-size:12px; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.ng-steps { counter-reset:ng; }
.ng-btn { display:block; width:100%; border:0; background:#ff5a2e; color:#fff; font-weight:700; font-size:16px; border-radius:24px;
  padding:13px 16px; cursor:pointer; font-family:inherit; }
.ng-btn:disabled { opacity:.7; cursor:default; }
.ng-btn.ghost { background:#fff0eb; color:#c23a10; margin-top:8px; }
.ng-fine { margin:10px 0 0; font-size:12px; color:#8696a0; line-height:1.4; word-break:break-word; }
`;

function permState() {
  if (typeof Notification === "undefined") return "unsupported";
  if (Notification.permission === "denied") return "denied";
  if (Notification.permission === "granted") return "granted";
  return "default";
}

export default function NotifyPrompt({ enabled, name = "Sprinter Support" }) {
  const [perm, setPerm] = useState("default");
  const [busy, setBusy] = useState(false);
  const [fine, setFine] = useState("");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const s = permState();
    setPerm(s);
    if (s === "granted") subscribePush().catch(() => {});
    if (sessionStorage.getItem("ng-hide")) setDismissed(true);
    navigator.permissions?.query?.({ name: "notifications" }).then((p) => {
      p.onchange = () => {
        const st = permState();
        setPerm(st);
        if (st === "granted") subscribePush().catch(() => {});
      };
    }).catch(() => {});
  }, [enabled]);

  const enable = async () => {
    setBusy(true);
    setFine("");
    try {
      const r = await Notification.requestPermission();
      if (r === "granted") {
        setPerm("granted");
        setFine("Setting up…");
        await subscribePush();
        setFine("");
        return;
      }
      setPerm(permState());
      if (r === "denied") setFine("");
    } catch (e) {
      setFine(e instanceof Error ? e.message : "Could not turn on notifications. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    sessionStorage.setItem("ng-hide", "1");
    setDismissed(true);
  };

  if (!enabled || dismissed || perm === "granted" || perm === "unsupported") return null;

  return (
    <>
      <style>{NG_CSS}</style>
      <div className="ng-back" role="dialog" aria-modal="true" aria-labelledby="ng-title">
        <div className="ng-card">
          <div className="ng-hero">
            <img className="ng-mark" src="/app/icon-192.png?v=3" alt="" aria-hidden="true" />
            <span className="ng-badge" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="#ff5a2e">
                <path d="M12 22c1.1 0 2-.9 2-2h-4a2 2 0 0 0 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4a1.5 1.5 0 0 0-3 0v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
              </svg>
            </span>
          </div>
          {perm === "default" && (
            <>
              <h1 id="ng-title">Don't miss replies from {name}</h1>
              <p className="ng-text">Turn on notifications so you know the moment support answers.</p>
              <ul className="ng-points">
                <li>Replies reach you even with the tab closed</li>
                <li>Call rings alert you instantly</li>
                <li>You can turn them off anytime</li>
              </ul>
              <button className="ng-btn" type="button" onClick={enable} disabled={busy}>
                {busy ? "Please wait…" : "Turn on notifications"}
              </button>
              <button className="ng-btn ghost" type="button" onClick={close}>
                Not now
              </button>
            </>
          )}
          {perm === "denied" && (
            <>
              <h1 id="ng-title">Notifications are blocked</h1>
              <p className="ng-text">Don't miss replies. Turn them back on in three steps:</p>
              <ol className="ng-steps">
                <li>Tap the lock icon in the address bar</li>
                <li>Open Site settings → Notifications</li>
                <li>Choose Allow, then come back here</li>
              </ol>
              <button
                className="ng-btn"
                type="button"
                onClick={() => {
                  if (typeof Notification !== "undefined") {
                    const p = permState();
                    setPerm(p);
                    if (p === "granted") subscribePush().catch(() => {});
                    else setFine("Still blocked — choose Allow in site settings");
                  }
                }}
              >
                I've allowed it
              </button>
              <button className="ng-btn ghost" type="button" onClick={close}>
                Maybe later
              </button>
            </>
          )}
          {fine ? <p className="ng-fine">{fine}</p> : null}
        </div>
      </div>
    </>
  );
}
