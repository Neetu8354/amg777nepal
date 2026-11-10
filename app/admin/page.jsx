"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CALL_CSS, CallOverlay, useVoiceCall } from "@/components/CallUI";
import { Tick, MsgText, StickerMsg, VoicePlayer, CallEventRow, EmojiGrid, StickerPicker, ImageViewer } from "@/components/ChatBits";
import { api, fmtTime, fmtDay, fmtAgo, sfx, isSticker, callInfo, avatarFor, subscribePush } from "@/lib/client";

const CSS = `
* { margin:0; padding:0; box-sizing:border-box; font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; -webkit-tap-highlight-color:transparent; }
html, body { height:100%; overscroll-behavior:none; }

/* login */
.a-login { min-height:100vh; display:flex; align-items:center; justify-content:center; padding:20px;
  background: radial-gradient(ellipse 60% 45% at 50% 0%, rgba(201,146,40,0.32), transparent 70%), #050505; }
.a-login-card { width:100%; max-width:340px; background:#000; border:1px solid rgba(234,75,28,0.45); border-radius:22px;
  padding:28px 26px; text-align:center; color:#eee; }
.a-login-card img { width:180px; height:auto; border-radius:10px; margin-bottom:12px; display:block; margin-left:auto; margin-right:auto; }
.a-login-card h1 { font-size:20px; margin:0 0 4px; background:linear-gradient(180deg,#ff9a70,#e13c0e);
  -webkit-background-clip:text; background-clip:text; color:transparent; }
.a-login-card p { color:#999; font-size:12.5px; margin:0 0 18px; }
.a-login-card input { width:100%; margin-bottom:10px; padding:11px 13px; border-radius:10px; border:1px solid rgba(234,75,28,0.6);
  background:#0c0c0c; color:#f2f2f2; font-size:15px; outline:none; }
.a-login-card input:focus { border-color:#ff6b4a; }
.a-login-card button { width:100%; padding:12px; border:0; border-radius:10px; font-weight:700; font-size:15px; cursor:pointer;
  background:linear-gradient(180deg,#2fdc6f,#1fbf58); color:#fff; }
.a-err { color:#ff6b6b; font-size:13px; margin-bottom:8px; }
.a-hint { color:#666; font-size:11px; margin-top:14px; }

/* console */
.a-root { height:100vh; height:100dvh; display:flex; background:#f6f7f9; overflow:hidden; }
.a-side { width:320px; min-width:260px; max-width:90vw; display:flex; flex-direction:column; background:#fff; border-right:1px solid #e3e8e6; flex-shrink:0; }
.a-side-head { background:#c23a10; color:#fff; padding:12px 12px; display:flex; align-items:center; gap:7px; overflow:hidden; }
.a-side-head img { height:26px; width:auto; border-radius:8px; flex-shrink:0; }
.a-side-head strong { flex:1; min-width:0; font-size:14px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.a-side-head button { background:rgba(255,255,255,.15); color:#fff; border:0; border-radius:16px; padding:6px 9px; font-size:12px; cursor:pointer; flex-shrink:0; }
.ag-overlay { position:fixed; inset:0; background:rgba(0,0,0,.55); z-index:300; display:flex; align-items:center; justify-content:center; padding:16px; }
.ag-panel { background:#fff; border-radius:14px; width:100%; max-width:400px; max-height:85vh; overflow:auto; }
.ag-head { display:flex; align-items:center; justify-content:space-between; padding:12px 14px; border-bottom:1px solid #eee; }
.ag-head button { border:0; background:none; font-size:16px; cursor:pointer; color:#666; }
.ag-form { padding:12px 14px; border-bottom:1px solid #eee; display:flex; flex-direction:column; gap:8px; }
.ag-form input { padding:9px 11px; border:1px solid #ddd; border-radius:8px; font-size:14px; }
.ag-def { font-size:13px; color:#555; display:flex; gap:6px; align-items:center; }
.ag-add { padding:10px; border:0; border-radius:8px; background:#e13c0e; color:#fff; font-weight:700; cursor:pointer; }
.ag-list { padding:8px 14px 14px; }
.ag-row { display:flex; align-items:center; gap:8px; padding:8px 0; border-bottom:1px solid #f0f0f0; }
.ag-info { flex:1; font-size:13.5px; }
.ag-u { color:#888; font-size:12px; margin-left:4px; }
.ag-p { display:block; color:#c23a10; font-size:11.5px; }
.ag-tgl { border:0; border-radius:12px; padding:4px 10px; font-size:11px; cursor:pointer; background:#eee; color:#777; }
.ag-tgl.on { background:#dff3e3; color:#1a7f37; }
.ag-del { border:0; background:none; color:#c00; cursor:pointer; }
.ag-none { text-align:center; color:#999; font-size:13px; padding:16px; }
.a-search { padding:8px; border-bottom:1px solid #eee; }
.a-search input { width:100%; padding:8px 12px; border-radius:18px; border:1px solid #ddd; outline:none; font-size:13px; }
.a-list { flex:1; overflow-y:auto; }
.a-user { display:flex; align-items:center; gap:10px; padding:11px 12px; cursor:pointer; border-bottom:1px solid #f4f4f4; }
.a-user:hover { background:#f7f9f8; }
.a-user.sel { background:#eaf5f0; }
.a-av { width:44px; height:44px; border-radius:50%; flex-shrink:0; position:relative; background:#dfe5e8; }
.a-av img { width:44px; height:44px; border-radius:50%; object-fit:cover; }
.a-av .on { position:absolute; right:0; bottom:0; width:11px; height:11px; border-radius:50%; background:#ff5a2e; border:2px solid #fff; }
.a-uinfo { flex:1; min-width:0; }
.a-uname { font-size:14px; font-weight:600; color:#111; display:flex; align-items:center; gap:6px; }
.a-uprev { font-size:12.5px; color:#667781; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.a-uright { display:flex; flex-direction:column; align-items:flex-end; gap:3px; }
.a-utime { font-size:10.5px; color:#8696a0; }
.a-badge { background:#ff5a2e; color:#fff; border-radius:999px; min-width:19px; height:19px; font-size:11px; font-weight:700;
  display:flex; align-items:center; justify-content:center; padding:0 5px; }
.a-blocked { color:#e74c3c; font-size:10px; font-weight:700; }
.a-empty { padding:40px 20px; text-align:center; color:#999; font-size:13px; }

.a-main { flex:1; display:flex; flex-direction:column; min-width:0; }
.a-conv-head { background:#c23a10; color:#fff; padding:8px 12px; display:flex; align-items:center; gap:10px; min-height:56px; }
.a-conv-head img { width:38px; height:38px; border-radius:50%; object-fit:cover; border:2px solid rgba(255,255,255,.35); }
.a-back2 { display:flex; align-items:center; justify-content:center; background:none; border:0; color:#fff; font-size:17px; cursor:pointer; padding:4px 8px; flex-shrink:0; }
.a-ch-title { flex:1; min-width:0; }
.a-ch-name { font-size:14.5px; font-weight:600; }
.a-ch-sub { font-size:11px; color:rgba(255,255,255,.8); }
.a-ch-btns { display:flex; gap:6px; }
.a-ch-btns button { border:0; border-radius:16px; padding:6px 11px; font-size:12px; font-weight:600; cursor:pointer; }
.a-call { background:#ff5a2e; color:#fff; }
.a-block { background:rgba(255,255,255,.16); color:#fff; }
.a-block.on { background:#e74c3c; }
.a-nosel { flex:1; display:flex; align-items:center; justify-content:center; color:#9aa8ad; font-size:14px; flex-direction:column; gap:10px; }
.a-nosel i { font-size:46px; opacity:.3; }

/* chat pane (same look as user side) */
.chat-root { height:100%; display:flex; flex-direction:column; background:#efeae2; overflow:hidden; }
.wa-header { background:#c23a10; color:#fff; padding:8px 12px; display:flex; align-items:center; gap:10px; min-height:60px; box-shadow:0 2px 10px rgba(0,0,0,0.3); z-index:10; flex-shrink:0; }
.wa-back { color:#fff; font-size:18px; text-decoration:none; width:36px; height:36px; display:flex; align-items:center; justify-content:center; border-radius:50%; flex-shrink:0; }
.wa-back:hover { background:rgba(255,255,255,0.15); }
.wa-avatar-wrap { position:relative; width:42px; height:42px; flex-shrink:0; }
.wa-avatar { width:42px; height:42px; border-radius:50%; object-fit:cover; border:2px solid rgba(255,255,255,0.35); background:#e94b1c; display:block; }
.wa-info { flex:1; min-width:0; line-height:1.2; }
.wa-name { font-size:15px; font-weight:600; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.wa-status { font-size:11px; color:rgba(255,255,255,0.85); display:flex; align-items:center; gap:5px; margin-top:1px; min-height:14px; }
.wa-status.typing { color:#ff5a2e; font-weight:600; font-style:italic; }
.wa-dot { width:7px; height:7px; border-radius:50%; background:#ff5a2e; display:inline-block; animation:waBlink 1.5s ease-in-out infinite; }
@keyframes waBlink { 0%,100%{opacity:1} 50%{opacity:0.3} }
.wa-typing-dots { display:inline-flex; gap:2px; margin-left:3px; }
.wa-typing-dots span { width:4px; height:4px; background:currentColor; border-radius:50%; animation:waBounce 1.2s infinite; }
.wa-typing-dots span:nth-child(2) { animation-delay:0.2s; }
.wa-typing-dots span:nth-child(3) { animation-delay:0.4s; }
@keyframes waBounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-4px)} }
.wa-actions { display:flex; align-items:center; gap:6px; flex-shrink:0; }
.wa-call-btn { background:#ff5a2e; color:#fff; border:none; border-radius:20px; padding:6px 12px; font-size:12px; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:5px; }
.wa-call-btn:hover { background:#e94b1c; }
.wa-main { flex:1 1 auto; overflow-y:auto; overflow-x:hidden; padding:10px 5% 12px; -webkit-overflow-scrolling:touch; background:#efeae2 url("data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22120%22%20height%3D%22120%22%20viewBox%3D%220%200%20120%20120%22%20fill%3D%22none%22%20stroke%3D%22%23000%22%20stroke-opacity%3D%22.04%22%20stroke-width%3D%221.6%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Ccircle%20cx%3D%2218%22%20cy%3D%2220%22%20r%3D%227%22%2F%3E%3Cpath%20d%3D%22M52%2012l6%2010h-12z%22%2F%3E%3Cpath%20d%3D%22M92%2016c4-6%2012-6%2014%200s-6%2010-14%2014c-8-4-16-8-14-14s10-6%2014%200%22%2F%3E%3Crect%20x%3D%2212%22%20y%3D%2258%22%20width%3D%2216%22%20height%3D%2212%22%20rx%3D%223%22%2F%3E%3Cpath%20d%3D%22M50%2064c6-8%2014-8%2020%200%22%2F%3E%3Ccircle%20cx%3D%2296%22%20cy%3D%2262%22%20r%3D%223%22%2F%3E%3Ccircle%20cx%3D%22104%22%20cy%3D%2270%22%20r%3D%222%22%2F%3E%3Cpath%20d%3D%22M16%20100l8-6%208%206-8%206z%22%2F%3E%3Cpath%20d%3D%22M54%2096h16M62%2088v16%22%2F%3E%3Cpath%20d%3D%22M90%20104c0-8%2014-8%2014%200%22%2F%3E%3C%2Fsvg%3E"); }
.wa-main::-webkit-scrollbar { width:5px; }
.wa-main::-webkit-scrollbar-thumb { background:rgba(0,0,0,0.15); border-radius:3px; }
.wa-bubble.tail.mine { border-top-right-radius:0; }
.wa-bubble.tail.theirs { border-top-left-radius:0; }
.wa-bubble.tail::after { content:""; position:absolute; top:0; width:8px; height:13px; pointer-events:none; }
.wa-bubble.tail.mine::after { right:-8px; background:#ffd9cd; clip-path:polygon(0 0,100% 0,0 100%); }
.wa-bubble.tail.theirs::after { left:-8px; background:#fff; clip-path:polygon(0 0,100% 0,100% 100%); }
.wa-bubble.inline-meta .wa-meta { position:absolute; right:7px; bottom:4px; margin:0; }
.wa-meta-gap { display:inline-block; width:62px; height:1px; vertical-align:middle; }
.wa-meta-gap.mine { width:86px; }
.wa-meta-gap.edited { width:112px; }
.wa-meta-gap.mine.edited { width:136px; }
.wa-divider { display:flex; justify-content:center; margin:12px 0 8px; }
.wa-divider span { background:#fff; color:#54656f; padding:5px 12px; border-radius:7.5px; font-size:12.5px; box-shadow:0 1px .5px rgba(11,20,26,.13); }
.wa-msg-row { display:flex; margin-bottom:2px; align-items:flex-end; gap:6px; position:relative; }
.wa-msg-row.tail { margin-top:10px; }
.wa-msg-row.mine { justify-content:flex-end; flex-direction:row; }
.wa-msg-row.theirs { justify-content:flex-start; flex-direction:row; }
.wa-msg-row.system { justify-content:center; }
.wa-bubble { padding:6px 7px 8px 9px; border-radius:7.5px; box-shadow:0 1px .5px rgba(11,20,26,.13); position:relative; word-break:break-word; min-width:0; max-width:78%; cursor:default; }
.wa-bubble.mine { background:#ffd9cd; }
.wa-bubble.theirs { background:#fff; }
.wa-bubble.system { background:#e8f0fe; border-radius:16px; color:#555; font-size:12px; padding:8px 16px; text-align:center; max-width:90%; }
@media (hover:hover) { .wa-bubble { user-select:text; } }
.wa-text { font-size:14.2px; line-height:19px; color:#111b21; white-space:pre-wrap; word-wrap:break-word; overflow-wrap:anywhere; user-select:text; }
.wa-meta { display:flex; justify-content:flex-end; align-items:center; gap:3px; margin:2px 0 -4px; font-size:11px; line-height:15px; color:#667781; white-space:nowrap; }
.wa-tick { color:#8696a0; font-size:11px; display:inline-flex; align-items:center; }
.wa-ack { color:#8696a0; margin-left:2px; vertical-align:middle; }
.wa-ack.read { color:#53bdeb; }
.wa-logout { background:rgba(255,255,255,0.14); color:#fff; border:none; border-radius:20px; padding:6px 10px; font-size:12px; font-weight:600; cursor:pointer; }
.wa-edited { font-style:italic; }
.wa-empty { text-align:center; color:#888; margin-top:60px; }
.wa-empty i { font-size:50px; opacity:0.25; display:block; margin-bottom:12px; }
.wa-reply-quote { background:rgba(0,0,0,0.07); border-left:3px solid #ff5a2e; border-radius:4px; padding:4px 8px; margin-bottom:5px; font-size:12px; max-width:100%; }
.wa-bubble.mine .wa-reply-quote { background:rgba(0,0,0,0.08); }
.wa-reply-quote .wa-reply-name { font-weight:600; color:#c23a10; font-size:11px; margin-bottom:1px; }
.wa-reply-quote .wa-reply-text { color:#555; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:220px; }
.voice-player { display:flex; align-items:center; gap:8px; background:rgba(0,0,0,0.05); border-radius:20px; padding:4px 10px 4px 6px; margin-top:2px; min-width:170px; max-width:100%; }
.voice-player .vp-btn { background:#c23a10; color:#fff; border:none; width:28px; height:28px; border-radius:50%; font-size:11px; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.voice-player .vp-bar { flex:1; height:3px; background:#ccc; border-radius:2px; cursor:pointer; position:relative; min-width:60px; }
.voice-player .vp-fill { height:100%; background:#c23a10; border-radius:2px; }
.voice-player .vp-time { font-size:11px; color:#666; min-width:32px; text-align:right; }
.wa-context-bar { background:#fff; border-top:1px solid #e0e0e0; padding:8px 12px; display:flex; align-items:center; gap:10px; border-left:4px solid #ff5a2e; flex-shrink:0; }
.wa-context-bar.editing { border-left-color:#f39c12; }
.wa-context-info { flex:1; min-width:0; }
.wa-context-title { font-size:11px; font-weight:700; color:#c23a10; margin-bottom:2px; }
.wa-context-bar.editing .wa-context-title { color:#f39c12; }
.wa-context-preview { font-size:12.5px; color:#666; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.wa-context-close { background:none; border:none; font-size:20px; color:#999; cursor:pointer; padding:2px 6px; flex-shrink:0; }
.wa-input-bar { background:#f0f0f0; padding:6px 8px; display:flex; align-items:flex-end; gap:5px; border-top:1px solid #ddd; flex-shrink:0; padding-bottom:calc(6px + env(safe-area-inset-bottom, 0px)); position:relative; z-index:5; }
.wa-input-actions { display:flex; align-items:center; gap:1px; flex-shrink:0; }
.wa-ia-btn { background:none; border:none; font-size:18px; cursor:pointer; padding:6px; width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; color:#555; }
.wa-ia-btn:active { background:rgba(0,0,0,0.1); }
.wa-ia-btn.emoji { color:#f39c12; }
.wa-ia-btn.mic { color:#e74c3c; }
.wa-ia-btn.attach { color:#3498db; }
.wa-ia-btn.recording { background:#e74c3c; color:#fff; animation:waPulse 1s infinite; }
@keyframes waPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
.wa-rec-bar { position:fixed; bottom:76px; left:50%; transform:translateX(-50%); background:#e74c3c; color:#fff; padding:10px 20px; border-radius:24px; font-size:13px; font-weight:600; display:flex; align-items:center; gap:10px; z-index:100; }
.wa-rec-bar .dot { width:10px; height:10px; background:#fff; border-radius:50%; animation:waPulse 1s infinite; }
.wa-input-wrap { flex:1 1 auto; min-width:0; background:#fff; border-radius:22px; display:flex; align-items:flex-end; padding:3px 8px; border:1px solid #ddd; }
.wa-input-wrap:focus-within { border-color:#ff5a2e; }
.wa-input-wrap textarea { flex:1; border:none; outline:none; resize:none; padding:8px 4px; font-size:15px; font-family:inherit; background:transparent; color:#1a1a1a; max-height:100px; line-height:1.4; min-width:0; }
.wa-input-emoji { background:none; border:none; font-size:19px; color:#888; cursor:pointer; padding:4px; flex-shrink:0; }
.wa-send-btn { background:#c23a10; color:#fff; border:none; border-radius:50%; width:42px; height:42px; font-size:17px; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.wa-send-btn:disabled { background:#aaa; cursor:not-allowed; }
.wa-emoji-picker { position:fixed; bottom:70px; right:12px; background:#fff; border-radius:12px; box-shadow:0 6px 24px rgba(0,0,0,0.2); padding:10px; z-index:100; display:grid; grid-template-columns:repeat(6,1fr); gap:2px; max-width:280px; max-height:220px; overflow-y:auto; }
.wa-emoji-picker button { background:none; border:none; font-size:20px; cursor:pointer; padding:6px; border-radius:6px; }
.wa-img { max-width:220px; max-height:220px; width:100%; height:auto; border-radius:6px; margin-top:4px; display:block; cursor:pointer; object-fit:cover; }
.wa-vid { max-width:240px; max-height:240px; width:100%; border-radius:6px; margin-top:4px; display:block; }
.wa-link { color:#027eb5; text-decoration:underline; word-break:break-all; }
.wa-lp { display:block; margin-top:6px; background:rgba(0,0,0,0.06); border-radius:8px; overflow:hidden; text-decoration:none; color:inherit; max-width:260px; }
.wa-lp-img { width:100%; height:120px; object-fit:cover; display:block; background:#ddd; }
.wa-lp-body { padding:8px 10px; }
.wa-lp-site { font-size:11px; color:#667781; text-transform:lowercase; }
.wa-lp-title { font-size:13.5px; font-weight:600; color:#111; line-height:1.25; margin-top:2px; }
.wa-lp-desc { font-size:12px; color:#667781; margin-top:2px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
.wa-toast { position:fixed; top:70px; right:16px; background:#333; color:#fff; padding:10px 18px; border-radius:24px; font-size:13px; font-weight:600; box-shadow:0 6px 20px rgba(0,0,0,0.3); z-index:9999; }
.wa-toast.error { background:#e74c3c; }
.wa-toast.success { background:#27ae60; }
.wa-toast.info { background:#4a90e2; }

@media (max-width:760px) {
  .a-side { width:100%; max-width:100%; border-right:0; }
  .a-side.hidden { display:none; }
  .a-main.hidden { display:none; }
  .a-back2 { display:block; }
}
`;

export default function AdminPage() {
  const [authed, setAuthed] = useState(null);
  useEffect(() => {
    api("/api/admin/me").then((r) => setAuthed(!!r.data?.success));
  }, []);
  if (authed === null) {
    return <div style={{ minHeight: "100vh", background: "#050505" }} />;
  }
  return authed ? <Console /> : <Login onOk={() => setAuthed(true)} />;
}

function Login({ onOk }) {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    setErr("");
    const r = await api("/api/admin/login", { method: "POST", body: { username: u.trim(), password: p } });
    setBusy(false);
    if (r.data?.success) onOk();
    else setErr(r.data?.error || "Invalid credentials");
  };
  return (
    <>
      <style>{CSS}</style>
      <div className="a-login">
        <form
          className="a-login-card"
          onSubmit={(e) => {
            e.preventDefault();
            go();
          }}
        >
          <img src="/app/icon-192.png?v=2" alt="" />
          <h1>Admin Login</h1>
          <p>Billy777 Customer Support — agent console</p>
          {err && <div className="a-err">{err}</div>}
          <input placeholder="Username" value={u} onChange={(e) => setU(e.target.value)} autoComplete="username" />
          <input placeholder="Password" type="password" value={p} onChange={(e) => setP(e.target.value)} autoComplete="current-password" />
          <button disabled={busy}>{busy ? "Please wait…" : "Login"}</button>
          <div className="a-hint">Protected by security monitoring</div>
        </form>
      </div>
    </>
  );
}

function AgentsPanel({ onClose }) {
  const [list, setList] = useState([]);
  const [f, setF] = useState({ username: "", password: "", name: "", prefixes: "", is_default: false });
  const [err, setErr] = useState("");
  const load = useCallback(async () => {
    const r = await api("/api/admin/agents", { cache: "no-store" });
    if (r.data?.success) setList(r.data.agents);
  }, []);
  useEffect(() => { load(); }, [load]);
  const create = async () => {
    setErr("");
    const r = await api("/api/admin/agents", { method: "POST", body: f });
    if (r.data?.success) { setF({ username: "", password: "", name: "", prefixes: "", is_default: false }); load(); }
    else setErr(r.data?.error || "Failed");
  };
  const act = async (body) => { await api("/api/admin/agents", { method: "POST", body }); load(); };
  return (
    <div className="ag-overlay" onClick={onClose}>
      <div className="ag-panel" onClick={(e) => e.stopPropagation()}>
        <div className="ag-head"><strong>Agents</strong><button onClick={onClose}><i className="fas fa-times" /></button></div>
        <div className="ag-form">
          <input placeholder="Name (e.g. PK Agent)" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <input placeholder="Username" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} />
          <input placeholder="Password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
          <input placeholder="Country codes e.g. 92,977" value={f.prefixes} onChange={(e) => setF({ ...f, prefixes: e.target.value })} />
          <label className="ag-def"><input type="checkbox" checked={f.is_default} onChange={(e) => setF({ ...f, is_default: e.target.checked })} /> Default (catch-all)</label>
          {err && <div className="a-err">{err}</div>}
          <button className="ag-add" onClick={create}>Add agent</button>
        </div>
        <div className="ag-list">
          {list.map((a) => (
            <div key={a.id} className="ag-row">
              <div className="ag-info">
                <b>{a.name}</b> <span className="ag-u">@{a.username}</span>
                <span className="ag-p">+{(a.prefixes || []).join(", +") || "—"}{a.is_default ? " · default" : ""}</span>
              </div>
              <button className={`ag-tgl ${a.active ? "on" : ""}`} onClick={() => act({ action: "update", id: a.id, active: !a.active })}>{a.active ? "Active" : "Off"}</button>
              <button className="ag-del" onClick={() => act({ action: "delete", id: a.id })}><i className="fas fa-trash" /></button>
            </div>
          ))}
          {!list.length && <div className="ag-none">No agents yet</div>}
        </div>
      </div>
    </div>
  );
}

function Console() {
  const [users, setUsers] = useState([]);
  const [sel, setSel] = useState(null);
  const [role, setRole] = useState(null);
  const [agentsOpen, setAgentsOpen] = useState(false);
  const [msgsMap, setMsgsMap] = useState({}); // userId -> [msg]
  const [typingMap, setTypingMap] = useState({});
  const [onlineMap, setOnlineMap] = useState({});
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [toast, setToast] = useState(null);
  const [q, setQ] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuFor, setMenuFor] = useState(null);
  const [viewer, setViewer] = useState(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [stickerOpen, setStickerOpen] = useState(false);
  const [rec, setRec] = useState(null);

  const selRef = useRef(null);
  selRef.current = sel;
  const mainRef = useRef(null);
  const taRef = useRef(null);
  const imgRef = useRef(null);
  const typingTimer = useRef(null);
  const typingSent = useRef(0);
  const toastTimer = useRef(null);
  const recRef = useRef(null);

  const call = useVoiceCall({ actor: "admin", endpoint: "/api/admin/call" });

  const [notifOn, setNotifOn] = useState(false);

  const showToast = useCallback((msg, kind = "") => {
    setToast({ msg, kind, id: Date.now() });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const enableNotifs = useCallback(async () => {
    try {
      if (typeof Notification === "undefined") return showToast("Notifications not supported in this browser");
      let p = Notification.permission;
      if (p === "default") p = await Notification.requestPermission();
      if (p !== "granted") { setNotifOn(false); return showToast("Notifications blocked — allow them in site settings"); }
      await subscribePush();
      setNotifOn(true);
      showToast("Call alerts on — you'll be notified even with this tab closed", "success");
    } catch (e) {
      showToast(e?.message || "Could not enable notifications");
    }
  }, [showToast]);

  const refreshUsers = useCallback(async () => {
    const r = await api("/api/admin/users", { cache: "no-store" });
    if (r.data?.success) {
      setUsers(r.data.users);
      const map = {};
      r.data.users.forEach((u) => (map[u.id] = u.online));
      setOnlineMap(map);
    } else if (r.status === 401) window.location.reload();
  }, []);

  const openUser = useCallback(async (id) => {
    setSel(id);
    setMobileOpen(true);
    setReplyTo(null);
    const r = await api(`/api/admin/messages?u=${id}`, { cache: "no-store" });
    if (r.data?.success) {
      setMsgsMap((m) => ({ ...m, [id]: r.data.messages }));
      setUsers((us) => us.map((u) => (u.id === id ? { ...u, unread: 0 } : u)));
      setTimeout(() => { const el = mainRef.current; if (el) el.scrollTop = el.scrollHeight; }, 40);
    }
  }, []);

  useEffect(() => {
    refreshUsers();
    api("/api/admin/me").then((r) => setRole(r.data?.role || null));
    // silently re-subscribe if permission was granted before; else bell enables it
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      subscribePush().then((ok) => setNotifOn(!!ok)).catch(() => {});
    }
    const es = new EventSource("/api/admin/events");
    es.addEventListener("message", (e) => {
      try {
        const { userId, user, message } = JSON.parse(e.data);
        if (user) {
          setUsers((us) => {
            const ex = us.find((u) => u.id === userId);
            const base = ex || { id: userId, ...user, unread: 0 };
            const next = { ...base, last_message: message, unread: message.sender === "user" && selRef.current !== userId ? (base.unread || 0) + 1 : base.unread || 0 };
            return [next, ...us.filter((u) => u.id !== userId)]; // bump active chat to top
          });
        }
        setMsgsMap((m) => {
          const l = m[userId];
          if (!l) return m;
          const i = l.findIndex((x) => x.id === message.id);
          if (i >= 0) {
            const n = [...l]; n[i] = message; return { ...m, [userId]: n };
          }
          return { ...m, [userId]: [...l, message] };
        });
        if (message.sender === "user") {
          sfx.msgIn();
          if (selRef.current === userId) {
            api(`/api/admin/messages?u=${userId}`, { cache: "no-store" }); // marks read → emits 'read' back
            setTimeout(() => { const el = mainRef.current; if (el) el.scrollTop = el.scrollHeight; }, 30);
          }
        }
      } catch {}
    });
    es.addEventListener("typing", (e) => {
      try {
        const p = JSON.parse(e.data);
        setTypingMap((m) => ({ ...m, [p.userId]: !!p.is_typing }));
      } catch {}
    });
    es.addEventListener("presence", (e) => {
      try {
        const p = JSON.parse(e.data);
        if (p.userId) setOnlineMap((m) => ({ ...m, [p.userId]: !!p.online }));
      } catch {}
    });
    es.addEventListener("read", (e) => {
      try {
        const { userId, ids } = JSON.parse(e.data);
        const now = new Date().toISOString();
        setMsgsMap((m) => ({
          ...m,
          [userId]: (m[userId] || []).map((x) => (ids.includes(x.id) ? { ...x, read_at: x.read_at || now, is_delivered: 1 } : x)),
        }));
      } catch {}
    });
    es.addEventListener("delivered", (e) => {
      try {
        const { userId, ids } = JSON.parse(e.data);
        setMsgsMap((m) => ({
          ...m,
          [userId]: (m[userId] || []).map((x) => (ids.includes(x.id) ? { ...x, is_delivered: 1 } : x)),
        }));
      } catch {}
    });
    es.addEventListener("edited", (e) => {
      try {
        const { userId, message } = JSON.parse(e.data);
        setMsgsMap((m) => ({ ...m, [userId]: (m[userId] || []).map((x) => (x.id === message.id ? message : x)) }));
      } catch {}
    });
    es.addEventListener("deleted", (e) => {
      try {
        const { userId, id } = JSON.parse(e.data);
        setMsgsMap((m) => ({ ...m, [userId]: (m[userId] || []).filter((x) => x.id !== id) }));
      } catch {}
    });
    es.addEventListener("blocked", (e) => {
      try {
        const { userId, blocked } = JSON.parse(e.data);
        setUsers((us) => us.map((u) => (u.id === userId ? { ...u, blocked } : u)));
      } catch {}
    });
    es.addEventListener("user", () => refreshUsers());
    es.addEventListener("call", (e) => {
      try {
        const p = JSON.parse(e.data);
        if (p.action === "incoming" && p.userId) setSel((s) => s || p.userId);
        call.onEvent(p);
      } catch {}
    });
    return () => es.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const send = async () => {
    const t = text.trim();
    if (!t || !sel || sending) return;
    setSending(true);
    const r = await api("/api/admin/send", { method: "POST", body: { userId: sel, message: t, reply_to: replyTo?.id ?? null } });
    setSending(false);
    if (r.data?.success) {
      setText("");
      setReplyTo(null);
      api("/api/admin/typing", { method: "POST", body: { userId: sel, is_typing: false } });
      setTimeout(() => { const el = mainRef.current; if (el) el.scrollTop = el.scrollHeight; }, 30);
      if (taRef.current) taRef.current.style.height = "auto";
    } else showToast(r.data?.error || "Send failed", "error");
  };

  const onType = (v) => {
    setText(v);
    if (sel && Date.now() - typingSent.current > 1800) {
      typingSent.current = Date.now();
      api("/api/admin/typing", { method: "POST", body: { userId: sel, is_typing: true } });
    }
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      if (sel) api("/api/admin/typing", { method: "POST", body: { userId: sel, is_typing: false } });
    }, 2200);
    const el = taRef.current;
    if (el) { el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 100) + "px"; }
  };

  const attachImage = async (file) => {
    if (!file || !sel) return;
    const fd = new FormData();
    fd.append("kind", "image");
    fd.append("file", file);
    fd.append("userId", String(sel));
    const r = await fetch("/api/admin/send-media", { method: "POST", body: fd }).then((x) => x.json()).catch(() => null);
    if (!r?.success) showToast(r?.error || "Upload failed", "error");
  };

  const sendSticker = async (kind, value) => {
    setStickerOpen(false);
    if (!sel) return;
    const m = kind === "emoji" ? `sticker:emoji:${value}` : `sticker:${value}`;
    await api("/api/admin/send", { method: "POST", body: { userId: sel, message: m } });
  };

  const toggleRec = async () => {
    if (recRef.current) {
      try { recRef.current.mr.stop(); } catch {}
      return;
    }
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return showToast("Mic access denied", "error");
    }
    const mr = new MediaRecorder(stream);
    const chunks = [];
    const started = Date.now();
    mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    mr.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      recRef.current = null;
      setRec(null);
      if ((Date.now() - started) / 1000 < 1 || !sel) return;
      const blob = new Blob(chunks, { type: mr.mimeType || "audio/webm" });
      const fd = new FormData();
      fd.append("kind", "audio");
      fd.append("file", new File([blob], "voice.webm", { type: blob.type }));
      fd.append("userId", String(sel));
      await fetch("/api/admin/send-media", { method: "POST", body: fd }).catch(() => {});
    };
    recRef.current = { mr, chunks };
    mr.start();
    setRec({ secs: 0 });
  };

  useEffect(() => {
    if (!rec) return;
    const t = setInterval(() => setRec((r) => r && { secs: r.secs + 1 }), 1000);
    return () => clearInterval(t);
  }, [rec]);

  const toggleBlock = async () => {
    const u = users.find((x) => x.id === sel);
    if (!u) return;
    const r = await api("/api/admin/block", { method: "POST", body: { userId: sel, blocked: !u.blocked } });
    if (r.data?.success) setUsers((us) => us.map((x) => (x.id === sel ? { ...x, blocked: !u.blocked } : x)));
  };

  const logout = async () => {
    await api("/api/admin/logout", { method: "POST" });
    window.location.reload();
  };

  const msgs = (sel && msgsMap[sel]) || [];
  const selUser = users.find((u) => u.id === sel);
  const filtered = users.filter((u) => !q || u.mobile.includes(q) || (u.display_name || "").toLowerCase().includes(q.toLowerCase()));

  const rows = useMemo(() => {
    const out = [];
    let lastDay = null;
    let lastSide = null;
    for (const m of msgs) {
      const day = fmtDay(m.created_at);
      if (day !== lastDay) {
        lastDay = day; lastSide = null;
        out.push(<div className="wa-divider" key={`d-${m.id}`}><span>{day}</span></div>);
      }
      const mine = m.sender === "admin";
      const side = mine ? "mine" : m.sender === "system" ? "system" : "theirs";
      const isCall = m.type === "call" || !!callInfo(m.message);
      const tail = side !== lastSide;
      lastSide = side;
      if (isCall) {
        out.push(
          <div key={m.id} className={`wa-msg-row ${side} ${tail ? "tail" : ""}`}>
            <CallEventRow message={m.message} createdAt={m.created_at} viewer="admin" onDelete={() => setMenuFor(m)} />
          </div>
        );
        continue;
      }
      const sticker = isSticker(m.message);
      const plain = m.message && !sticker && !m.image && !m.video_file && !m.audio_file;
      const replySrc = m.reply_to != null ? msgs.find((x) => x.id === m.reply_to) : null;
      out.push(
        <div key={m.id} className={`wa-msg-row ${side} ${tail ? "tail" : ""}`}>
          <div
            className={`wa-bubble ${side} ${tail ? "tail" : ""} ${plain ? "inline-meta" : ""}`}
            onContextMenu={(e) => { e.preventDefault(); setMenuFor(m); }}
          >
            {m.reply_to != null && (
              <div className="wa-reply-quote">
                <div className="wa-reply-name">{replySrc?.sender === "user" ? selUser?.display_name || "Customer" : "You"}</div>
                <div className="wa-reply-text">{replySrc ? prev(replySrc) : "Message"}</div>
              </div>
            )}
            {sticker ? <StickerMsg text={m.message} /> : m.message ? (
              <>
                <MsgText text={m.message} preview={m.link_preview} />
                {plain ? <span className={`wa-meta-gap ${mine ? "mine" : ""} ${m.edited_at ? "edited" : ""}`} /> : null}
              </>
            ) : null}
            {m.image ? <img className="wa-img" src={m.image} alt="" onClick={(e) => { e.stopPropagation(); setViewer({ src: m.image, caption: m.message }); }} /> : null}
            {m.video_file ? <video className="wa-vid" controls preload="metadata" playsInline src={m.video_file} /> : null}
            {m.audio_file ? <VoicePlayer src={m.audio_file} /> : null}
            <div className="wa-meta">
              {m.edited_at ? <span className="wa-edited">edited</span> : null}
              <span suppressHydrationWarning>{fmtTime(m.created_at)}</span>
              {mine ? <Tick m={m} /> : null}
            </div>
          </div>
        </div>
      );
    }
    return out;
  }, [msgs, selUser]);

  const menuItems = menuFor
    ? [
        { label: "Reply", icon: "fas fa-reply", onClick: () => { setReplyTo(menuFor); setTimeout(() => taRef.current?.focus(), 60); } },
        menuFor.message
          ? { label: "Copy", icon: "far fa-copy", onClick: () => navigator.clipboard?.writeText(menuFor.message).catch(() => {}) }
          : null,
        {
          label: "Delete",
          icon: "far fa-trash-can",
          onClick: async () => {
            await api("/api/admin/delete", { method: "POST", body: { userId: sel, id: menuFor.id } });
            setMsgsMap((m) => ({ ...m, [sel]: (m[sel] || []).filter((x) => x.id !== menuFor.id) }));
          },
        },
      ].filter(Boolean)
    : [];

  return (
    <>
      <style>{CSS + CALL_CSS}</style>
      <div className="a-root">
        <aside className={`a-side ${mobileOpen ? "hidden" : ""}`}>
          <div className="a-side-head">
            {role === "main" && <button onClick={() => setAgentsOpen(true)} title="Agents"><i className="fas fa-users-gear" /></button>}
            <img src="/app/billy-logo.png" alt="" />
            <strong>Billy777 Admin</strong>
            <button onClick={enableNotifs} title={notifOn ? "Call alerts on" : "Enable call alerts"} style={notifOn ? { color: "#25d366" } : undefined}>
              <i className={`fas ${notifOn ? "fa-bell" : "fa-bell-slash"}`} />
            </button>
            <button onClick={refreshUsers} title="Refresh"><i className="fas fa-rotate" /></button>
            <button onClick={logout} title="Logout"><i className="fas fa-right-from-bracket" /></button>
          </div>
          <div className="a-search">
            <input placeholder="Search mobile…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="a-list">
            {filtered.length === 0 && <div className="a-empty">No customers yet — they'll appear here after logging in.</div>}
            {filtered.map((u) => (
              <div key={u.id} className={`a-user ${sel === u.id ? "sel" : ""}`} onClick={() => openUser(u.id)}>
                <div className="a-av">
                  <img src={avatarFor(u.username)} alt="" />
                  {onlineMap[u.id] ? <span className="on" /> : null}
                </div>
                <div className="a-uinfo">
                  <div className="a-uname">
                    {u.display_name || u.mobile}
                    {u.blocked ? <span className="a-blocked">BLOCKED</span> : null}
                  </div>
                  <div className="a-uprev">
                    {typingMap[u.id] ? <i style={{ color: "#ff5a2e" }}>typing…</i> : u.last_message ? prev(u.last_message) : "No messages"}
                  </div>
                </div>
                <div className="a-uright">
                  <span className="a-utime">{u.last_message ? fmtAgo(u.last_message.created_at) : ""}</span>
                  {u.unread ? <span className="a-badge">{u.unread}</span> : null}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <section className={`a-main ${!mobileOpen || !sel ? "hidden" : ""}`}>
          {!sel ? (
            <div className="a-nosel">
              <i className="fas fa-headset" />
              Select a customer to open their chat
            </div>
          ) : (
            <div className="chat-root">
              <header className="wa-header">
                <button className="a-back2" onClick={() => { setMobileOpen(false); setSel(null); }} aria-label="Back to customers" title="Back to customers">
                  <i className="fas fa-arrow-left" />
                </button>
                <div className="wa-avatar-wrap">
                  <img className="wa-avatar" src={avatarFor(selUser?.username)} alt="" />
                </div>
                <div className="wa-info">
                  <div className="wa-name">{selUser?.display_name || selUser?.mobile || "Customer"}</div>
                  {typingMap[sel] ? (
                    <div className="wa-status typing">
                      typing
                      <span className="wa-typing-dots"><span /><span /><span /></span>
                    </div>
                  ) : onlineMap[sel] ? (
                    <div className="wa-status"><span className="wa-dot" /> Online</div>
                  ) : (
                    <div className="wa-status" style={{ color: "rgba(255,255,255,0.7)" }}>
                      {selUser?.last_seen ? `last seen ${fmtAgo(selUser.last_seen)}` : "Offline"}
                    </div>
                  )}
                </div>
                <div className="wa-actions">
                  <button
                    className={`wa-logout ${selUser?.blocked ? "" : ""}`}
                    style={selUser?.blocked ? { background: "#e74c3c" } : undefined}
                    onClick={toggleBlock}
                  >
                    {selUser?.blocked ? "Unblock" : "Block"}
                  </button>
                  <button
                    className="wa-call-btn"
                    onClick={async () => {
                      const r = await call.start(sel);
                      if (r?.error) showToast(r.error, "error");
                    }}
                  >
                    <i className="fas fa-phone-alt" /> Call
                  </button>
                </div>
              </header>

              <main className="wa-main" ref={mainRef}>
                {msgs.length === 0 && (
                  <div className="wa-empty">
                    <i className="fas fa-comments" />
                    <p>No messages yet</p>
                  </div>
                )}
                {rows}
              </main>

              {replyTo && (
                <div className="wa-context-bar">
                  <div className="wa-context-info">
                    <div className="wa-context-title">Reply to {replyTo.sender === "user" ? selUser?.display_name || "Customer" : "You"}</div>
                    <div className="wa-context-preview">{prev(replyTo)}</div>
                  </div>
                  <button className="wa-context-close" onClick={() => setReplyTo(null)}>×</button>
                </div>
              )}

              {emojiOpen && <EmojiGrid onPick={(e) => { setText((t) => t + e); taRef.current?.focus(); }} />}
              {stickerOpen && <StickerPicker onPick={sendSticker} />}
              {rec && (
                <div className="wa-rec-bar">
                  <span className="dot" />
                  {`Recording ${Math.floor(rec.secs / 60)}:${String(rec.secs % 60).padStart(2, "0")} — tap mic to stop`}
                </div>
              )}
              <div className="wa-input-bar">
                <div className="wa-input-actions">
                  <button className="wa-ia-btn emoji" title="Emoji" onClick={() => { setStickerOpen(false); setEmojiOpen((v) => !v); }}>
                    <i className="far fa-smile" />
                  </button>
                  <button className="wa-ia-btn emoji" title="Stickers" onClick={() => { setEmojiOpen(false); setStickerOpen((v) => !v); }}>
                    <i className="fas fa-note-sticky" />
                  </button>
                  <button className={`wa-ia-btn mic ${rec ? "recording" : ""}`} title={rec ? "Stop" : "Voice message"} onClick={toggleRec}>
                    <i className={`fas ${rec ? "fa-stop" : "fa-microphone"}`} />
                  </button>
                  <button className="wa-ia-btn attach" title="Photo" onClick={() => imgRef.current?.click()}>
                    <i className="fas fa-paperclip" />
                  </button>
                </div>
                <div className="wa-input-wrap">
                  <textarea
                    ref={taRef}
                    rows={1}
                    value={text}
                    onChange={(e) => onType(e.target.value)}
                    placeholder="Type a reply..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
                      if (e.key === "Escape") setReplyTo(null);
                    }}
                  />
                </div>
                <button className="wa-send-btn" onClick={send} disabled={sending || !text.trim()}>
                  <i className={`fas ${sending ? "fa-spinner fa-spin" : "fa-paper-plane"}`} />
                </button>
              </div>
              <input ref={imgRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) attachImage(f); }} />
            </div>
          )}
        </section>
      </div>

      {menuFor && (
        <div className="wa-sheet-backdrop" onClick={() => setMenuFor(null)}>
          <div className="wa-sheet" onClick={(e) => e.stopPropagation()}>
            {menuItems.map((it, i) => (
              <button key={i} onClick={() => { setMenuFor(null); it.onClick?.(); }}>
                <i className={it.icon} /> {it.label}
              </button>
            ))}
            <button className="cancel" onClick={() => setMenuFor(null)}>Cancel</button>
          </div>
        </div>
      )}
      <style>{`.wa-sheet-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:2000;display:flex;align-items:flex-end;justify-content:center}
.wa-sheet{background:#fff;width:100%;max-width:440px;border-radius:16px 16px 0 0;padding:6px 0}
.wa-sheet button{display:flex;align-items:center;gap:12px;width:100%;background:none;border:none;padding:15px 22px;font-size:15px;text-align:left;cursor:pointer;color:#1a1a1a;font-family:inherit}
.wa-sheet button:active{background:#f0f0f0}
.wa-sheet button.cancel{color:#e74c3c;font-weight:600;border-top:1px solid #eee;margin-top:4px;justify-content:center}
.wa-sheet button i{width:20px;text-align:center;font-size:15px;color:#666}`}</style>
      {viewer && <ImageViewer src={viewer.src} caption={viewer.caption} onClose={() => setViewer(null)} />}
      {agentsOpen && <AgentsPanel onClose={() => setAgentsOpen(false)} />}
      {toast && <div key={toast.id} className={`wa-toast ${toast.kind}`}>{toast.msg}</div>}

      <CallOverlay
        state={call.state}
        avatar={selUser ? avatarFor(selUser.username) : undefined}
        onAccept={call.accept}
        onDecline={call.decline}
        onEnd={call.end}
        onMute={call.toggleMute}
        onHold={call.toggleHold}
        minimizable
      />
    </>
  );
}

function prev(m) {
  if (!m) return "";
  if (isSticker(m.message)) return "✨ Sticker";
  if (m.type === "call" || callInfo(m.message)) return "📞 Voice call";
  if (m.image) return "📷 Photo";
  if (m.video_file) return "🎥 Video";
  if (m.audio_file) return "🎤 Voice message";
  return m.message || "";
}
