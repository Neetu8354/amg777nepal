"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import InstallApp from "@/components/InstallApp";
import NotifyPrompt from "@/components/NotifyPrompt";
import VisitBeacon from "@/components/VisitBeacon";
import { CALL_CSS, CallOverlay, useVoiceCall } from "@/components/CallUI";
import {
  Tick, MsgText, StickerMsg, VoicePlayer, CallEventRow,
  EmojiGrid, StickerPicker, MediaComposer, Sheet, ImageViewer,
} from "@/components/ChatBits";
import {
  api, fmtTime, fmtDay, fmtAgo, sfx, isSticker, callInfo, avatarFor,
} from "@/lib/client";

const CSS = `
.call-ev, .wa-link, .wa-lp, .wa-lp-img, .wa-lp-body, .wa-lp-site, .wa-lp-title, .wa-lp-desc {}

* { margin:0; padding:0; box-sizing:border-box; font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; -webkit-tap-highlight-color:transparent; }
html, body { height:100%; overscroll-behavior:none; }
.chat-root { height:100vh; height:100dvh; display:flex; flex-direction:column; background:#efeae2; overflow:hidden; }

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

.wa-bubble { padding:6px 7px 8px 9px; border-radius:7.5px; box-shadow:0 1px .5px rgba(11,20,26,.13); position:relative; word-break:break-word; min-width:0; max-width:78%; cursor:default; user-select:none; }
.wa-bubble.mine { background:#ffd9cd; }
.wa-bubble.theirs { background:#fff; }
.wa-bubble.system { background:#e8f0fe; border-radius:16px; color:#555; font-size:12px; padding:8px 16px; text-align:center; max-width:90%; }

@media (hover: hover) { .wa-bubble { user-select:text; } }
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
.wa-ia-btn.video { color:#9b59b6; }
.wa-ia-btn.recording { background:#e74c3c; color:#fff; animation:waPulse 1s infinite; }
@keyframes waPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }

.wa-input-wrap { flex:1 1 auto; min-width:0; background:#fff; border-radius:22px; display:flex; align-items:flex-end; padding:3px 8px; border:1px solid #ddd; }
.wa-input-wrap:focus-within { border-color:#ff5a2e; }
.wa-input-wrap textarea { flex:1; border:none; outline:none; resize:none; padding:8px 4px; font-size:15px; font-family:inherit; background:transparent; color:#1a1a1a; max-height:100px; line-height:1.4; min-width:0; }
.wa-input-emoji { background:none; border:none; font-size:19px; color:#888; cursor:pointer; padding:4px; flex-shrink:0; }

.wa-send-btn { background:#c23a10; color:#fff; border:none; border-radius:50%; width:42px; height:42px; font-size:17px; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.wa-send-btn:disabled { background:#aaa; cursor:not-allowed; }

.wa-emoji-picker { position:fixed; bottom:70px; right:12px; background:#fff; border-radius:12px; box-shadow:0 6px 24px rgba(0,0,0,0.2); padding:10px; z-index:100; display:grid; grid-template-columns:repeat(6, 1fr); gap:2px; max-width:280px; max-height:220px; overflow-y:auto; }
.wa-emoji-picker button { background:none; border:none; font-size:20px; cursor:pointer; padding:6px; border-radius:6px; }

.wa-img { max-width:220px; max-height:220px; width:100%; height:auto; border-radius:6px; margin-top:4px; display:block; cursor:pointer; object-fit:cover; }
.wa-vid { max-width:240px; max-height:240px; width:100%; border-radius:6px; margin-top:4px; display:block; }
.wa-audio { margin-top:4px; max-width:230px; }

.wa-viewer { position:fixed; inset:0; z-index:1000; background:rgba(0,0,0,.92); display:flex; align-items:center; justify-content:center; flex-direction:column; cursor:zoom-out; }
.wa-viewer img { max-width:92vw; max-height:82vh; border-radius:10px; box-shadow:0 8px 40px rgba(0,0,0,.5); }
.wa-viewer .wa-vcap { color:#fff; margin-top:12px; font-size:14px; max-width:80vw; text-align:center; }
.wa-viewer .wa-vx { position:absolute; top:14px; right:16px; width:38px; height:38px; border-radius:50%; background:rgba(255,255,255,.15); color:#fff; border:none; font-size:18px; cursor:pointer; }
.wa-img-preview { position:fixed; bottom:76px; left:12px; background:#fff; border-radius:8px; padding:6px; box-shadow:0 4px 16px rgba(0,0,0,0.2); z-index:100; }
.wa-img-preview img { max-width:100px; max-height:80px; border-radius:6px; display:block; }
.wa-img-preview button { position:absolute; top:-6px; right:-6px; background:#e74c3c; color:#fff; border:none; border-radius:50%; width:20px; height:20px; font-size:12px; cursor:pointer; }

.wa-rec-bar { position:fixed; bottom:76px; left:50%; transform:translateX(-50%); background:#e74c3c; color:#fff; padding:10px 20px; border-radius:24px; font-size:13px; font-weight:600; display:flex; align-items:center; gap:10px; z-index:100; }
.wa-rec-bar .dot { width:10px; height:10px; background:#fff; border-radius:50%; animation:waPulse 1s infinite; }
.wa-up-bar { position:fixed; bottom:76px; left:50%; transform:translateX(-50%); background:#c23a10; color:#fff; padding:10px 16px; border-radius:24px; font-size:12px; font-weight:600; z-index:100; min-width:220px; max-width:90%; }
.wa-up-track { height:5px; background:rgba(255,255,255,0.25); border-radius:4px; margin-top:6px; overflow:hidden; }
.wa-up-fill { height:100%; background:#ff5a2e; border-radius:4px; transition:width 0.15s linear; }

.wa-toast { position:fixed; top:70px; right:16px; background:#333; color:#fff; padding:10px 18px; border-radius:24px; font-size:13px; font-weight:600; box-shadow:0 6px 20px rgba(0,0,0,0.3); z-index:9999; max-width:90%; }
.wa-toast.error { background:#e74c3c; }
.wa-toast.success { background:#27ae60; }
.wa-toast.info { background:#4a90e2; }

.wa-sheet-backdrop { position:fixed; inset:0; background:rgba(0,0,0,0.45); z-index:2000; display:flex; align-items:flex-end; justify-content:center; animation:waFade 0.15s ease; }
@keyframes waFade { from { opacity:0 } to { opacity:1 } }
.wa-sheet { background:#fff; width:100%; max-width:440px; border-radius:16px 16px 0 0; padding:6px 0 calc(6px + env(safe-area-inset-bottom, 0px)); animation:waSheetUp 0.2s ease; }
@keyframes waSheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
.wa-sheet button { display:flex; align-items:center; gap:12px; width:100%; background:none; border:none; padding:15px 22px; font-size:15px; text-align:left; cursor:pointer; color:#1a1a1a; font-family:inherit; }
.wa-sheet button:active { background:#f0f0f0; }
.wa-sheet button.cancel { color:#e74c3c; font-weight:600; border-top:1px solid #eee; margin-top:4px; justify-content:center; }
.wa-sheet button i { width:20px; text-align:center; font-size:15px; color:#666; }

@media (max-width:480px) {
  .wa-bubble { max-width:85%; }
  .wa-header { min-height:56px; padding:6px 10px; }
  .wa-name { font-size:14px; }
  .wa-ia-btn { width:30px; height:30px; font-size:16px; padding:5px; }
  .wa-send-btn { width:38px; height:38px; font-size:15px; }
}
`;

const SUPPORT_FALLBACK = {
  display_name: "amg777 Customer Support",
  avatar_url: avatarFor("amg777_support"),
};

export default function ChatPage() {
  const [me, setMe] = useState(null);
  const [support, setSupport] = useState(SUPPORT_FALLBACK);
  const [msgs, setMsgs] = useState([]);
  const [online, setOnline] = useState(false);
  const [typing, setTyping] = useState(false);
  const [lastSeen, setLastSeen] = useState(null);
  const [blocked, setBlocked] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [stickerOpen, setStickerOpen] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [editing, setEditing] = useState(null);
  const [menuFor, setMenuFor] = useState(null);
  const [toast, setToast] = useState(null);
  const [composer, setComposer] = useState(null); // {kind:'image'|'video', file}
  const [rec, setRec] = useState(null); // {secs}
  const [upload, setUpload] = useState(null); // {label, pct}
  const [gone, setGone] = useState(false);
  const [viewer, setViewer] = useState(null);

  const mainRef = useRef(null);
  const taRef = useRef(null);
  const imgRef = useRef(null);
  const vidRef = useRef(null);
  const recRef = useRef(null); // {mr, chunks, started}
  const typingSent = useRef(0);
  const typingStop = useRef(null);
  const stick = useRef(true);
  const toastTimer = useRef(null);

  const call = useVoiceCall({ actor: "user", endpoint: "/api/chat/call" });

  const showToast = useCallback((msg, kind = "") => {
    setToast({ msg, kind, id: Date.now() });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const scrollDown = useCallback((force) => {
    const el = mainRef.current;
    if (!el) return;
    if (force || stick.current) el.scrollTop = el.scrollHeight;
  }, []);

  const upsert = useCallback((m) => {
    setMsgs((list) => {
      const i = list.findIndex((x) => x.id === m.id);
      if (i >= 0) {
        const next = [...list];
        next[i] = { ...next[i], ...m };
        return next;
      }
      // replace a pending optimistic with same text
      const pi = list.findIndex((x) => x.pending && x.sender === m.sender && x.message === m.message && m.sender === "user");
      if (pi >= 0) {
        const next = [...list];
        next[pi] = m;
        return next;
      }
      return [...list, m];
    });
  }, []);

  const ack = useCallback(() => {
    if (document.visibilityState === "visible" && document.hasFocus()) {
      api("/api/chat/ack", { method: "POST" }).catch(() => {});
    }
  }, []);

  /* ---------- boot ---------- */
  useEffect(() => {
    let dead = false;
    (async () => {
      const r = await api("/api/chat/hello", { cache: "no-store" });
      if (dead) return;
      if (!r.data?.success) {
        window.location.replace("/verify");
        return;
      }
      setMe({ username: r.data.username, user_id: r.data.user_id });
      setSupport(r.data.support || SUPPORT_FALLBACK);
      setMsgs(r.data.messages || []);
      setOnline(!!r.data.admin_online);
      setLastSeen(r.data.admin_last_seen);
      setBlocked(!!r.data.blocked);
      setTimeout(() => scrollDown(true), 50);
      ack();
    })();
    return () => { dead = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- SSE ---------- */
  useEffect(() => {
    if (!me) return;
    const es = new EventSource("/api/chat/events");
    es.addEventListener("message", (e) => {
      try {
        const { message } = JSON.parse(e.data);
        upsert(message);
        if (message.sender === "admin") {
          sfx.msgIn();
          ack();
        }
        scrollDown();
      } catch {}
    });
    es.addEventListener("delivered", (e) => {
      try {
        const { ids } = JSON.parse(e.data);
        setMsgs((l) => l.map((m) => (ids.includes(m.id) ? { ...m, is_delivered: 1, pending: false } : m)));
      } catch {}
    });
    es.addEventListener("read", (e) => {
      try {
        const { ids } = JSON.parse(e.data);
        const now = new Date().toISOString();
        setMsgs((l) => l.map((m) => (ids.includes(m.id) ? { ...m, is_delivered: 1, read_at: m.read_at || now, pending: false } : m)));
      } catch {}
    });
    es.addEventListener("typing", (e) => {
      try {
        const p = JSON.parse(e.data);
        if (p.by === "admin") setTyping(!!p.is_typing);
      } catch {}
    });
    es.addEventListener("presence", (e) => {
      try {
        const p = JSON.parse(e.data);
        if (p.by === "admins") {
          setOnline(!!p.online);
          if (!p.online) { setTyping(false); setLastSeen(new Date().toISOString()); }
        }
      } catch {}
    });
    es.addEventListener("blocked", (e) => {
      try {
        const p = JSON.parse(e.data);
        setBlocked(!!p.blocked);
        if (!p.blocked) showToast("You were unblocked.", "success");
      } catch {}
    });
    es.addEventListener("edited", (e) => {
      try { upsert(JSON.parse(e.data).message); } catch {}
    });
    es.addEventListener("deleted", (e) => {
      try {
        const { id } = JSON.parse(e.data);
        setMsgs((l) => l.filter((m) => m.id !== id));
      } catch {}
    });
    es.addEventListener("call", (e) => {
      try { call.onEvent(JSON.parse(e.data)); } catch {}
    });
    const onVis = () => ack();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    return () => {
      es.close();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);

  /* ---------- typing indicator ---------- */
  const sendTyping = useCallback((on) => {
    const now = Date.now();
    if (on && now - typingSent.current < 2000) return;
    typingSent.current = now;
    api("/api/chat/typing", { method: "POST", body: { is_typing: on } }).catch(() => {});
  }, []);

  const onType = (v) => {
    setText(v);
    sendTyping(!!v);
    clearTimeout(typingStop.current);
    if (v) typingStop.current = setTimeout(() => sendTyping(false), 2500);
    const el = taRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 100) + "px";
    }
  };

  /* ---------- send ---------- */
  const send = async () => {
    const t = text.trim();
    if (!t || sending || gone) return;
    setSending(true);
    try {
      if (editing) {
        const r = await api("/api/messages/edit", { method: "POST", body: { id: editing.id, message: t } });
        if (r.data?.success) {
          upsert(r.data.message);
          setEditing(null);
          setText("");
          showToast("✏️ Message edited", "success");
        } else showToast(r.data?.error || "Edit failed", "error");
      } else {
        const optimistic = {
          id: -Date.now(), sender: "user", username: me.username, message: t,
          image: null, audio_file: null, video_file: null, type: "text",
          reply_to: replyTo?.id ?? null, reply_preview: replyTo ? prev(replyTo) : null,
          created_at: new Date().toISOString(), pending: true, is_delivered: 0, read_at: null,
        };
        setMsgs((l) => [...l, optimistic]);
        setText("");
        setReplyTo(null);
        setEmojiOpen(false);
        setStickerOpen(false);
        sfx.msgOut();
        sendTyping(false);
        const r = await api("/api/messages/send", { method: "POST", body: { message: t, reply_to: replyTo?.id ?? null } });
        if (r.data?.success) upsert(r.data.message);
        else {
          setMsgs((l) => l.filter((m) => m.id !== optimistic.id));
          showToast(r.data?.error || "Message nahi gaya", "error");
          setText(t);
        }
      }
      setTimeout(() => scrollDown(true), 40);
    } finally {
      setSending(false);
      taRef.current && (taRef.current.style.height = "auto");
    }
  };

  const sendSticker = async (kind, value) => {
    const m = kind === "emoji" ? `sticker:emoji:${value}` : `sticker:${value}`;
    setStickerOpen(false);
    const optimistic = {
      id: -Date.now(), sender: "user", username: me.username, message: m,
      type: "text", created_at: new Date().toISOString(), pending: true,
    };
    setMsgs((l) => [...l, optimistic]);
    const r = await api("/api/messages/send", { method: "POST", body: { message: m } });
    if (r.data?.success) upsert(r.data.message);
    else setMsgs((l) => l.filter((x) => x.id !== optimistic.id));
    scrollDown(true);
  };

  /* ---------- media ---------- */
  const uploadMedia = (kind, file, caption) => {
    if (!file) return;
    setUpload({ label: kind === "audio" ? "Sending voice…" : "Uploading…", pct: 0 });
    const fd = new FormData();
    fd.append("kind", kind);
    fd.append("file", file);
    fd.append("caption", caption || "");
    if (replyTo) fd.append("reply_to", JSON.stringify(replyTo.id));
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/messages/send-media");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setUpload((u) => u && { ...u, pct: Math.round((e.loaded / e.total) * 96) });
    };
    xhr.onload = () => {
      setUpload((u) => u && { ...u, pct: 96 });
      try {
        const d = JSON.parse(xhr.responseText);
        if (d?.success) {
          upsert(d.message);
          setReplyTo(null);
          sfx.msgOut();
          scrollDown(true);
        } else showToast(d?.error || "Upload failed", "error");
      } catch {
        showToast("Upload failed", "error");
      }
      setTimeout(() => setUpload(null), 300);
    };
    xhr.onerror = () => { setUpload(null); showToast("Upload failed", "error"); };
    xhr.send(fd);
  };

  const pickFile = (kind, file) => {
    if (!file) return;
    const limit = kind === "image" ? 5 * 1024 * 1024 : 50 * 1024 * 1024;
    if (file.size > limit) return showToast(kind === "image" ? "Image > 5MB" : "Video > 50MB", "error");
    setComposer({ kind, file });
  };

  /* ---------- voice recording ---------- */
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
    mr.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      recRef.current = null;
      setRec(null);
      const secs = (Date.now() - started) / 1000;
      if (secs < 1) return showToast("Voice too short", "error");
      const blob = new Blob(chunks, { type: mr.mimeType || "audio/webm" });
      uploadMedia("audio", new File([blob], "voice.webm", { type: blob.type }), "");
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

  /* ---------- message menu ---------- */
  const openMenu = (m) => setMenuFor(m);

  const msgActions = menuFor
    ? [
        { label: "Reply", icon: "fas fa-reply", onClick: () => { setReplyTo(menuFor); setEditing(null); setTimeout(() => taRef.current?.focus(), 60); } },
        menuFor.message
          ? {
              label: "Copy",
              icon: "far fa-copy",
              onClick: async () => {
                try { await navigator.clipboard.writeText(menuFor.message); showToast("Copied", "success"); }
                catch { showToast("Copy failed", "error"); }
              },
            }
          : null,
        menuFor.sender === "user" && menuFor.message && !isSticker(menuFor.message) && menuFor.type !== "call"
          ? {
              label: "Edit",
              icon: "fas fa-pen",
              onClick: () => { setEditing(menuFor); setReplyTo(null); setText(menuFor.message || ""); setTimeout(() => taRef.current?.focus(), 60); },
            }
          : null,
        menuFor.id > 0
          ? {
              label: "Delete",
              icon: "far fa-trash-can",
              onClick: async () => {
                const r = await api("/api/messages/delete", { method: "POST", body: { id: menuFor.id } });
                if (r.data?.success) setMsgs((l) => l.filter((m) => m.id !== menuFor.id));
              },
            }
          : null,
      ].filter(Boolean)
    : [];

  /* ---------- logout / call ---------- */
  const logout = async () => {
    await api("/api/chat/logout", { method: "POST" }).catch(() => {});
    window.location.replace("/verify");
  };

  const startCall = async () => {
    if (call.state.active) return;
    const r = await call.start();
    if (r?.error) showToast(r.error, "error");
  };

  /* ---------- render helpers ---------- */
  const rows = useMemo(() => {
    const out = [];
    let lastDay = null;
    let lastSide = null;
    for (const m of msgs) {
      const day = fmtDay(m.created_at);
      if (day !== lastDay) {
        lastDay = day;
        lastSide = null;
        out.push(
          <div className="wa-divider" key={`d-${m.id}`}>
            <span>{day}</span>
          </div>
        );
      }
      const mine = m.sender === "user";
      const side = mine ? "mine" : m.type === "system" || m.sender === "system" ? "system" : "theirs";
      const isCall = m.type === "call" || !!callInfo(m.message);
      const tail = side !== lastSide;
      lastSide = side;
      if (isCall) {
        out.push(
          <div key={m.id} className={`wa-msg-row ${side} ${tail ? "tail" : ""}`}>
            <CallEventRow message={m.message} createdAt={m.created_at} viewer="user" />
          </div>
        );
        continue;
      }
      const sticker = isSticker(m.message);
      const plain = m.message && !sticker && !m.image && !m.video_file && !m.audio_file;
      const replySrc = m.reply_to != null ? msgs.find((x) => x.id === m.reply_to) : null;
      out.push(
        <div key={m.id} className={`wa-msg-row ${side} ${tail ? "tail" : ""}`} data-mid={m.id} data-read={m.read_at ? 1 : 0}>
          <div
            className={`wa-bubble ${side} ${tail ? "tail" : ""} ${plain ? "inline-meta" : ""}`}
            onContextMenu={(e) => { e.preventDefault(); openMenu(m); }}
            onTouchStart={(e) => {
              const t = setTimeout(() => openMenu(m), 500);
              const clear = () => clearTimeout(t);
              e.currentTarget.addEventListener("touchend", clear, { once: true });
              e.currentTarget.addEventListener("touchmove", clear, { once: true });
            }}
          >
            {m.reply_to != null && (
              <div className="wa-reply-quote">
                <div className="wa-reply-name">
                  {(replySrc?.sender || m.reply_sender) === "admin" ? support.display_name : m.reply_sender === "user" ? "You" : replySrc ? "You" : "Message"}
                </div>
                <div className="wa-reply-text">{replySrc ? prev(replySrc) : m.reply_preview || "Message"}</div>
              </div>
            )}
            {sticker ? (
              <StickerMsg text={m.message} />
            ) : m.message ? (
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [msgs, support]);

  const status = typing ? (
    <div className="wa-status typing">
      typing
      <span className="wa-typing-dots">
        <span /><span /><span />
      </span>
    </div>
  ) : online ? (
    <div className="wa-status">
      <span className="wa-dot" /> Online
    </div>
  ) : lastSeen ? (
    <div className="wa-status" style={{ color: "rgba(255,255,255,0.7)" }}>
      last seen {fmtAgo(lastSeen)}
    </div>
  ) : (
    <div className="wa-status" style={{ color: "rgba(255,255,255,0.7)" }}>Offline</div>
  );

  const title = support?.display_name || "Chat";

  return (
    <>
      <style>{CSS + CALL_CSS}</style>
      <VisitBeacon />
      <div className="chat-root">
        <header className="wa-header">
          <a className="wa-back" href="/social">
            <i className="fas fa-arrow-left" />
          </a>
          <div className="wa-avatar-wrap">
            <img className="wa-avatar" src={support?.avatar_url || avatarFor("amg777_support")} alt={title} />
          </div>
          <div className="wa-info">
            <div className="wa-name">{title}</div>
            {status}
          </div>
          <div className="wa-actions">
            <button className="wa-logout" onClick={logout}>
              Logout
            </button>
            <button
              className="wa-call-btn"
              onClick={startCall}
              disabled={blocked}
              title={blocked ? "Calls are disabled" : "Call"}
              style={blocked ? { opacity: 0.45, cursor: "not-allowed" } : undefined}
            >
              <i className="fas fa-phone-alt" /> Call
            </button>
          </div>
        </header>

        <InstallApp variant="inline" />
        <NotifyPrompt enabled={!!me} name={support?.display_name || "Support"} />

        <main className="wa-main" ref={mainRef} onScroll={(e) => {
          const el = e.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}>
          {msgs.length === 0 && (
            <div className="wa-empty">
              <i className="fas fa-comments" />
              <p>No messages yet — say hi! 👋</p>
            </div>
          )}
          {rows}
        </main>

        {rec && (
          <div className="wa-rec-bar">
            <span className="dot" />
            {`Recording ${Math.floor(rec.secs / 60)}:${String(rec.secs % 60).padStart(2, "0")} — tap mic to stop`}
          </div>
        )}
        {upload && (
          <div className="wa-up-bar">
            {upload.label} {upload.pct}%
            <div className="wa-up-track">
              <div className="wa-up-fill" style={{ width: `${upload.pct}%` }} />
            </div>
          </div>
        )}

        {emojiOpen && <EmojiGrid onPick={(e) => { setText((t) => t + e); taRef.current?.focus(); }} />}
        {stickerOpen && <StickerPicker onPick={sendSticker} />}

        {(replyTo || editing) && (
          <div className={`wa-context-bar ${editing ? "editing" : ""}`}>
            <div className="wa-context-info">
              <div className="wa-context-title">
                {editing ? "Edit message" : `Reply to ${(replyTo?.sender === "admin" ? support.display_name : "You")}`}
              </div>
              <div className="wa-context-preview">{prev(editing || replyTo)}</div>
            </div>
            <button className="wa-context-close" onClick={() => { setReplyTo(null); setEditing(null); setText(""); }}>
              ×
            </button>
          </div>
        )}

        {blocked ? (
          <div
            style={{
              display: "flex", justifyContent: "center", padding: "14px",
              background: "#f0f0f0", color: "#e74c3c", fontSize: 13, fontWeight: 600, textAlign: "center",
            }}
          >
            <i className="fas fa-ban" style={{ marginRight: 8 }} />
            You are blocked — messages are disabled until support unblocks you.
          </div>
        ) : (
          <div className="wa-input-bar" onClick={() => { setEmojiOpen(false); setStickerOpen(false); }}>
            <div className="wa-input-actions" onClick={(e) => e.stopPropagation()}>
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
              <button className="wa-ia-btn video" title="Video" onClick={() => vidRef.current?.click()}>
                <i className="fas fa-video" />
              </button>
            </div>
            <div className="wa-input-wrap" onClick={(e) => e.stopPropagation()}>
              <textarea
                ref={taRef}
                rows={1}
                value={text}
                onChange={(e) => onType(e.target.value)}
                placeholder={editing ? "Edit message..." : "Type a message..."}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                  if (e.key === "Escape") {
                    setEditing(null);
                    setReplyTo(null);
                    setText("");
                  }
                }}
              />
              <button className="wa-input-emoji" onClick={() => { setStickerOpen(false); setEmojiOpen((v) => !v); }}>
                <i className="far fa-smile" />
              </button>
            </div>
            <button className="wa-send-btn" onClick={send} disabled={sending || !text.trim()}>
              <i className={`fas ${sending ? "fa-spinner fa-spin" : editing ? "fa-check" : "fa-paper-plane"}`} />
            </button>
          </div>
        )}

        <input ref={imgRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) pickFile("image", f); }} />
        <input ref={vidRef} type="file" accept="video/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) pickFile("video", f); }} />

        {composer && (
          <MediaComposer
            kind={composer.kind}
            file={composer.file}
            sending={!!upload}
            onCancel={() => setComposer(null)}
            onSend={(caption) => {
              const c = composer;
              setComposer(null);
              uploadMedia(c.kind, c.file, caption);
            }}
          />
        )}

        {viewer && <ImageViewer src={viewer.src} caption={viewer.caption} onClose={() => setViewer(null)} />}
        {menuFor && <Sheet items={msgActions} onClose={() => setMenuFor(null)} />}
        {toast && <div key={toast.id} className={`wa-toast ${toast.kind}`}>{toast.msg}</div>}

        <CallOverlay
          state={call.state}
          avatar={support?.avatar_url}
          onAccept={call.accept}
          onDecline={call.decline}
          onEnd={call.end}
          onMute={call.toggleMute}
          onHold={call.toggleHold}
          minimizable
        />
      </div>
    </>
  );
}

function prev(m) {
  if (!m) return "";
  if (isSticker(m.message)) return "✨ Sticker";
  if (m.type === "call") return "📞 Voice call";
  if (m.image) return "📷 Photo";
  if (m.video_file) return "🎥 Video";
  if (m.audio_file) return "🎤 Voice message";
  return m.message || "";
}
