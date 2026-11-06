"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

const APP_NAME = "billy777";
const ICON = "/app/icon-192.png?v=2";

const IA_CSS = `
.ia-card { background:#fff; color:#111; display:flex; align-items:center; gap:12px; padding:12px 12px 12px 14px;
  font-family:system-ui,-apple-system,'Segoe UI',sans-serif; box-sizing:border-box; }
.ia-card.floating { position:fixed; left:12px; right:12px; bottom:calc(12px + env(safe-area-inset-bottom)); z-index:9990;
  max-width:480px; margin:0 auto; border-radius:16px; box-shadow:0 12px 40px rgba(0,0,0,.25); animation:iaUp .35s ease-out; }
.ia-card.inline { flex-shrink:0; padding:8px 12px; gap:10px; border-bottom:1px solid #e3e8e6; box-shadow:0 1px 3px rgba(0,0,0,.06); z-index:5; }
.ia-card.inline .ia-icon { width:36px; height:36px; border-radius:10px; }
.ia-card.inline .ia-txt strong { font-size:14px; }
.ia-card.inline .ia-btn { padding:7px 14px; font-size:13px; }
.ia-icon { display:block; width:46px; height:46px; border-radius:12px; flex-shrink:0; background:#000; object-fit:contain; padding:4px; }
.ia-txt { flex:1; min-width:0; display:flex; flex-direction:column; line-height:1.25; }
.ia-txt strong { font-size:15px; color:#c23a10; }
.ia-txt span { font-size:12px; color:#555; }
.ia-btn { display:inline-flex; align-items:center; gap:6px; background:#ff5a2e; color:#fff; border:0; border-radius:22px; padding:9px 16px;
  font-weight:700; font-size:14px; cursor:pointer; white-space:nowrap; flex-shrink:0; font-family:inherit; text-decoration:none; }
.ia-btn:active { transform:scale(.97); }
.ia-btn.pulse { animation:iaGlow 1.6s ease-in-out infinite; }
.ia-btn.done { background:#ffece6; color:#e94b1c; cursor:default; }
.ia-btn.wide { flex:1; justify-content:center; padding:12px; margin-top:14px; font-size:15px; }
.ia-btn.ghost { background:#fff0eb; color:#c23a10; }
.ia-row { display:flex; gap:10px; }
.ia-guide { position:fixed; inset:0; z-index:9999; background:rgba(0,0,0,.6); display:flex; align-items:flex-end; justify-content:center;
  padding:16px 16px calc(16px + env(safe-area-inset-bottom)); font-family:system-ui,-apple-system,sans-serif; animation:iaFade .2s ease-out; }
@media (min-width:640px) { .ia-guide { align-items:center; } }
.ia-gbox { position:relative; background:#fff; color:#111; border-radius:20px; padding:20px; width:100%; max-width:380px; text-align:center;
  box-shadow:0 20px 50px rgba(0,0,0,.35); animation:iaUp .25s ease-out; }
.ia-gicon { display:block; width:64px; height:64px; border-radius:16px; margin:0 auto 10px; background:#000; object-fit:contain; padding:6px; }
.ia-gbox strong { color:#c23a10; font-size:16px; }
.ia-gbox p { font-size:14px; line-height:1.7; color:#333; margin:10px 0 0; }
.ia-steps { list-style:none; margin:14px 0 0; padding:0; text-align:left; display:flex; flex-direction:column; gap:10px; }
.ia-steps li { display:flex; align-items:flex-start; gap:10px; font-size:14px; line-height:1.7; color:#333; }
.ia-steps li > span { flex-shrink:0; width:24px; height:24px; border-radius:50%; background:#ff5a2e; color:#fff; font-weight:700;
  font-size:13px; display:flex; align-items:center; justify-content:center; margin-top:2px; }
.ia-key { display:inline-flex; align-items:center; gap:4px; background:#fff0eb; border-radius:8px; padding:1px 7px; color:#c23a10; white-space:nowrap; }
.ia-ok { margin-top:14px; background:transparent; border:0; color:#e94b1c; font-weight:700; font-size:14px; cursor:pointer; }
.ia-arrow { position:absolute; left:50%; bottom:-46px; transform:translateX(-50%); color:#fff; font-size:32px;
  animation:iaBounceDown 1s ease-in-out infinite; text-shadow:0 2px 8px rgba(0,0,0,.4); }
.ia-install { position:fixed; inset:0; z-index:10000; background:linear-gradient(135deg,#c23a10,#e94b1c); display:flex;
  align-items:center; justify-content:center; padding:24px; animation:iaFade .25s ease-out; font-family:system-ui,-apple-system,sans-serif; }
.ia-box { width:100%; max-width:340px; text-align:center; color:#fff; }
.ia-box h3 { font-size:20px; margin:22px 0 16px; }
.ia-box p { font-size:13px; opacity:.85; margin:12px 0 0; }
.ia-logo { position:relative; width:104px; height:104px; margin:0 auto; animation:iaPulse 1.4s ease-in-out infinite; }
.ia-logo.ok { animation:none; }
.ia-logo img { display:block; width:100%; height:100%; border-radius:26px; box-shadow:0 14px 34px rgba(0,0,0,.3); background:#000; object-fit:contain; padding:10px; }
.ia-check { position:absolute; right:-8px; bottom:-8px; width:38px; height:38px; border-radius:50%; background:#ff5a2e; border:3px solid #fff;
  display:flex; align-items:center; justify-content:center; font-size:16px; animation:iaPop .35s ease-out; }
.ia-bar { height:8px; border-radius:8px; background:rgba(255,255,255,.25); overflow:hidden; }
.ia-fill { height:100%; border-radius:8px; background:linear-gradient(90deg,#ff5a2e,#b9f6ca); transition:width .2s linear; }
.ia-pct { font-size:13px; font-weight:700; margin-top:8px; }
.ia-install .ia-btn { background:#fff; color:#c23a10; }
@keyframes iaUp { from { transform:translateY(30px); opacity:0; } to { transform:none; opacity:1; } }
@keyframes iaFade { from { opacity:0; } to { opacity:1; } }
@keyframes iaPulse { 0%,100% { transform:scale(1); } 50% { transform:scale(1.07); } }
@keyframes iaPop { from { transform:scale(0); } to { transform:scale(1); } }
@keyframes iaGlow { 0%,100% { box-shadow:0 0 0 0 rgba(37,211,102,.55); } 50% { box-shadow:0 0 0 8px rgba(37,211,102,0); } }
@keyframes iaBounceDown { 0%,100% { transform:translate(-50%,0); } 50% { transform:translate(-50%,8px); } }
@media (prefers-reduced-motion: reduce) { .ia-card, .ia-btn.pulse, .ia-logo, .ia-arrow, .ia-gbox { animation:none; } }
`;

function isStandalone() {
  return (
    typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true)
  );
}

function isIos() {
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function detectWay() {
  if (window.__sgInstall) return "prompt";
  if (isIos()) return "ios";
  if (/android/i.test(navigator.userAgent)) return "android";
  if (/macintosh|mac os/i.test(navigator.userAgent)) return "mac";
  return "desktop";
}

let snap = { ready: false, installed: false, way: "none", ios: false };
const listeners = new Set();
function setSnap(p) {
  snap = { ...snap, ...p };
  listeners.forEach((f) => f());
}
let booted = false;
function boot() {
  if (booted || typeof window === "undefined") return;
  booted = true;
  setSnap({ ready: true, installed: isStandalone(), way: detectWay(), ios: isIos() });
  window.addEventListener("sg-install-ready", () => {
    if (window.__sgInstall) setSnap({ way: "prompt", installed: isStandalone() });
  });
  window.addEventListener("appinstalled", () => {
    window.__sgInstall = null;
    setSnap({ installed: true });
  });
  window
    .matchMedia("(display-mode: standalone)")
    .addEventListener("change", () => setSnap({ installed: isStandalone() }));
}

function Key({ icon, children }) {
  return (
    <span className="ia-key">
      {icon ? <i className={icon} /> : null}
      {children}
    </span>
  );
}

function Guide({ way, ios, onClose }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const f = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [onClose]);

  const url = typeof location !== "undefined" ? location.href : "";
  const steps =
    way === "ios"
      ? [
          <>
            <Key icon="fas fa-arrow-up-from-bracket">Share</Key> button dabayein
          </>,
          <>
            <Key icon="far fa-square-plus">Add to Home Screen</Key> chunein
          </>,
          <>
            <Key>Add</Key> dabayein — app icon home screen par aa jayega
          </>,
        ]
      : way === "mac"
        ? [
            <>
              Address bar ya menu mein <Key icon="fas fa-arrow-up-from-bracket" /> dabayein
            </>,
            <>
              <Key>Add page to</Key> → <Key>Add to Dock</Key> chunein
            </>,
            <>
              <Key>Add</Key> dabayein — app Dock mein aa jayega
            </>,
          ]
        : [
            <>
              Upar browser ka <Key icon="fas fa-ellipsis-vertical" /> menu dabayein
            </>,
            <>
              <Key icon="fas fa-mobile-screen">Install app</Key> chunein
            </>,
            <>
              <Key>Install</Key> dabayein — app icon home screen par aa jayega
            </>,
          ];
  const title =
    way === "mac" ? "Mac par app install karein" : ios ? "iPhone par app install karein" : "Phone mein app install karein";

  return (
    <div className="ia-guide" role="dialog" aria-modal="true" aria-label={title} data-install-sheet onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ia-gbox">
        <img src={ICON} alt="" className="ia-gicon" />
        <strong>{title}</strong>
        <ol className="ia-steps">
          {steps.map((s, i) => (
            <li key={i}>
              <span>{i + 1}</span>
              <div>{s}</div>
            </li>
          ))}
        </ol>
        <button className="ia-ok" onClick={onClose}>
          Theek hai
        </button>
        {way === "ios" && (
          <div className="ia-arrow">
            <i className="fas fa-arrow-down" />
          </div>
        )}
      </div>
    </div>
  );
}

export default function InstallApp({ variant = "floating" }) {
  const st = useSyncExternalStore(
    (f) => {
      listeners.add(f);
      return () => listeners.delete(f);
    },
    () => snap,
    () => snap
  );
  const [, force] = useState(0);
  const [guide, setGuide] = useState(false);
  const [phase, setPhase] = useState("idle"); // idle | installing | done
  const [pct, setPct] = useState(0);
  const iv = useRef();
  const tm = useRef();

  useEffect(() => {
    boot();
    force((x) => x + 1);
    return () => {
      clearInterval(iv.current);
      clearTimeout(tm.current);
    };
  }, []);

  useEffect(() => {
    if (st.installed && phase === "installing") {
      clearInterval(iv.current);
      clearTimeout(tm.current);
      setPct(100);
      setPhase("done");
    }
  }, [st.installed, phase]);

  if (!st.ready) return null;

  const done = st.installed;
  const isMobile = st.ios || st.way === "android";
  const line = done
    ? isMobile
      ? "App install hai — home screen se kholein"
      : "App install hai — desktop / Start menu se kholein"
    : st.way === "prompt"
      ? "Tap karein — app turant install ho jayega"
      : `Install dabayein — ${isMobile ? "home screen par app icon banayein" : st.way === "mac" ? "Dock mein app add karein" : "app install ho jayega"}`;

  const onInstall = async () => {
    if (done || phase !== "idle") return;
    if (st.way !== "prompt") return setGuide(true);
    try {
      const r = await window.__sgInstall?.prompt();
      if (r?.outcome !== "accepted") return;
    } catch {}
    setPhase("installing");
    setPct(3);
    iv.current = setInterval(() => setPct((p) => Math.min(95, p + Math.max(0.3, (95 - p) * 0.04))), 200);
    tm.current = setTimeout(() => {
      clearInterval(iv.current);
      setPct(100);
      setPhase("done");
    }, 20000);
  };

  return (
    <>
      <style>{IA_CSS}</style>
      <div className={`ia-card ${variant}`} role="region" data-install="1">
        <img className="ia-icon" src={ICON} alt="" />
        <div className="ia-txt">
          <strong>{APP_NAME}</strong>
          <span>{line}</span>
        </div>
        {done ? (
          <div className="ia-btn done">
            <i className="fas fa-circle-check" /> Installed
          </div>
        ) : (
          <button className={`ia-btn ${phase === "idle" ? "pulse" : ""}`} onClick={onInstall}>
            <i className="fas fa-download" /> Install
          </button>
        )}
      </div>
      {guide && st.way !== "prompt" && <Guide way={st.way} ios={st.ios} onClose={() => setGuide(false)} />}
      {phase !== "idle" && (
        <div className="ia-install">
          <div className="ia-box">
            <div className={`ia-logo ${phase === "done" ? "ok" : ""}`}>
              <img src={ICON} alt="" />
              {phase === "done" && (
                <div className="ia-check">
                  <i className="fas fa-check" />
                </div>
              )}
            </div>
            <h3>{phase === "done" ? "App install ho gaya!" : "App install ho raha hai…"}</h3>
            <div className="ia-bar">
              <div className="ia-fill" style={{ width: `${Math.round(pct)}%` }} />
            </div>
            <div className="ia-pct">{Math.round(pct)}%</div>
            <p>
              {phase === "done"
                ? isMobile
                  ? `Home screen par ${APP_NAME} icon se app kholein.`
                  : `Desktop / Start menu par ${APP_NAME} se app kholein.`
                : "Please wait…"}
            </p>
            {phase === "done" && (
              <button className="ia-btn wide" onClick={() => setPhase("idle")}>
                Theek hai
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
