"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { fmtTime, fmtDur, callInfo } from "@/lib/client";

/* ---------- ticks ---------- */
export function Tick({ m }) {
  if (m.pending) return <span className="wa-tick" title="Sending"><i className="far fa-clock" style={{ fontSize: 10 }} /></span>;
  const read = !!m.read_at;
  const delivered = m.is_delivered || read;
  return (
    <span className={`wa-ack ${read ? "read" : ""}`} title={read ? "Read" : delivered ? "Delivered" : "Sent"}>
      <i className={`fas ${delivered ? "fa-check-double" : "fa-check"}`} style={{ fontSize: 11 }} />
    </span>
  );
}

/* ---------- text with links + link preview ---------- */
const LINK_RE = /\b((?:https?:\/\/|www\.)[^\s<>"'`]+)/gi;

export function MsgText({ text, preview }) {
  const parts = [];
  if (text) {
    let last = 0;
    const re = new RegExp(LINK_RE.source, "gi");
    let m;
    while ((m = re.exec(text))) {
      if (m.index > last) parts.push({ t: "t", v: text.slice(last, m.index) });
      let href = m[0].replace(/[),.;!?]+$/g, "");
      if (!/^https?:\/\//i.test(href)) href = "https://" + href.replace(/^\/\//, "");
      parts.push({ t: "a", v: m[0].replace(/[),.;!?]+$/g, ""), href });
      last = m.index + m[0].length;
    }
    if (last < text.length) parts.push({ t: "t", v: text.slice(last) });
  }
  let p = null;
  try { p = preview && (typeof preview === "string" ? JSON.parse(preview) : preview); } catch {}
  return (
    <>
      {text && (
        <span className="wa-text">
          {parts.map((x, i) =>
            x.t === "a" ? (
              <a key={i} className="wa-link" href={x.href} target="_blank" rel="noopener noreferrer">
                {x.v}
              </a>
            ) : (
              <span key={i}>{x.v}</span>
            )
          )}
        </span>
      )}
      {p?.url && (
        <a className="wa-lp" href={p.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
          {p.image ? <img className="wa-lp-img" src={p.image} alt="" /> : null}
          <span className="wa-lp-body">
            <span className="wa-lp-site">{p.site || p.url}</span>
            <span className="wa-lp-title">{p.title || p.url}</span>
            {p.description ? <span className="wa-lp-desc">{p.description}</span> : null}
          </span>
        </a>
      )}
    </>
  );
}

/* ---------- sticker ---------- */
export function StickerMsg({ text }) {
  if (text?.startsWith("sticker:emoji:")) {
    return <div style={{ fontSize: 56, lineHeight: 1.1, padding: "2px 4px" }}>{text.slice(14)}</div>;
  }
  if (text?.startsWith("sticker:")) {
    return <img src={text.slice(8)} alt="sticker" style={{ width: 128, height: 128, objectFit: "contain" }} />;
  }
  return null;
}

/* ---------- voice player ---------- */
export function VoicePlayer({ src }) {
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);

  const toggle = () => {
    const a = ref.current;
    if (!a) return;
    if (a.paused) { a.play().catch(() => {}); } else a.pause();
  };

  return (
    <div className="voice-player">
      <audio
        ref={ref}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setCur(0); }}
        onTimeUpdate={(e) => setCur(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDur(e.currentTarget.duration)}
      />
      <button className="vp-btn" onClick={toggle} type="button">
        <i className={`fas ${playing ? "fa-pause" : "fa-play"}`} />
      </button>
      <div
        className="vp-bar"
        onClick={(e) => {
          const a = ref.current;
          if (!a || !dur) return;
          const r = e.currentTarget.getBoundingClientRect();
          a.currentTime = ((e.clientX - r.left) / r.width) * dur;
        }}
      >
        <div className="vp-fill" style={{ width: dur ? `${(cur / dur) * 100}%` : "0%" }} />
      </div>
      <span className="vp-time">{fmtDur(playing || cur ? cur : dur)}</span>
    </div>
  );
}

/* ---------- call event row ---------- */
export function CallEventRow({ message, createdAt, viewer, onDelete }) {
  const info = callInfo(message);
  const status = info?.status || "completed";
  const out = !!info && (info.initiator || "user") === viewer; // viewer: 'user'|'admin' — whose perspective
  const live = status === "live";
  const missed = status === "missed" || status === "declined";
  const title =
    status === "missed" ? "Missed voice call"
    : status === "declined" ? "Declined voice call"
    : "Voice call";

  return (
    <div className={`call-ev ${missed ? "missed" : ""} ${live ? "live" : ""}`}>
      <div className="call-ic">
        <i className={`fas ${missed ? "fa-phone-slash" : "fa-phone"}`} />
      </div>
      <div>
        <div className="call-title">
          {info ? (
            <i
              className={`fas fa-arrow-right call-dir ${out ? "out" : "in"}`}
              title={out ? "Call you made" : "Call received"}
            />
          ) : null}
          {title}
        </div>
        <div className="call-meta">
          {status === "completed" && info?.duration ? <span>{fmtDur(info.duration)}</span> : null}
          {status === "declined" ? <span>Declined</span> : null}
          {createdAt ? <span suppressHydrationWarning>{fmtTime(createdAt)}</span> : null}
        </div>
      </div>
      {onDelete ? (
        <button className="call-del" onClick={(e) => { e.stopPropagation(); onDelete(); }} aria-label="Delete">
          <i className="fas fa-trash" />
        </button>
      ) : null}
    </div>
  );
}

/* ---------- emoji grid ---------- */
const EMOJIS = [
  ...new Set(
    "😀 😁 😂 🤣 😃 😄 😅 😆 😉 😊 😋 😎 😍 😘 🥰 😗 😙 😚 🙂 🤗 🤔 🤨 😐 😑 😶 🙄 😏 😣 😥 😮 🤐 😯 😪 😫 😴 😌 😛 😜 😝 🤤 😒 😓 😔 😕 🙃 🤑 😲 🙁 😖 😞 😟 😤 😢 😭 😦 😧 😨 😩 🤯 😬 😰 😱 🥵 🥶 😳 🤪 😵 😡 😠 🤬 😷 🤒 🤕 🤢 🤮 🥴 😇 🥳 🥺 🤠 🤡 🤥 🤫 🤭 🧐 🤓 😈 👿 👍 👎 👌 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 👇 ☝️ ✋ 🤚 🖐 🖖 👋 💪 🙏 ✍️ 👏 🙌 🤲 🤝 ❤️ 🧡 💛 💚 💙 💜 🖤 💔 💯 💥 🔥 ✨ 🎉 🎊 🎈 🎁 🏆 🚚 📦 ☕ 🍕 🌹 💐 ⭐ 🌟 ✅ ❌ ⚠️ 📞 💬".split(" ")
  ),
];

export function EmojiGrid({ onPick }) {
  return (
    <div className="wa-emoji-picker" onClick={(e) => e.stopPropagation()}>
      {EMOJIS.map((e) => (
        <button key={e} type="button" onClick={() => onPick(e)}>
          {e}
        </button>
      ))}
    </div>
  );
}

/* ---------- sticker picker ---------- */
export function StickerPicker({ onPick }) {
  const [list, setList] = useState([]);
  useEffect(() => {
    fetch("/api/chat/stickers")
      .then((r) => r.json())
      .then((d) => setList(d?.stickers || []))
      .catch(() => {});
  }, []);
  return (
    <div className="wa-emoji-picker" style={{ maxHeight: 280 }} onClick={(e) => e.stopPropagation()}>
      {list.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onPick(s.kind, s.value)}
          style={{ fontSize: 28 }}
        >
          {s.kind === "emoji" ? s.value : <img src={s.value} alt="" style={{ width: 40, height: 40, objectFit: "contain" }} />}
        </button>
      ))}
    </div>
  );
}

/* ---------- media composer (preview + caption) ---------- */
export function MediaComposer({ kind, file, onSend, onCancel, sending }) {
  const [caption, setCaption] = useState("");
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 3000, background: "rgba(0,0,0,.85)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 20,
      }}
      onClick={onCancel}
    >
      <div style={{ alignSelf: "flex-start", color: "#fff" }}>
        <button onClick={onCancel} style={{ background: "none", border: 0, color: "#fff", fontSize: 22, cursor: "pointer" }}>
          <i className="fas fa-times" />
        </button>
      </div>
      <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: "90vw", maxHeight: "60vh" }}>
        {kind === "video" ? (
          <video src={url} controls playsInline style={{ maxWidth: "100%", maxHeight: "55vh", borderRadius: 8 }} />
        ) : (
          <img src={url} alt="" style={{ maxWidth: "100%", maxHeight: "55vh", borderRadius: 8 }} />
        )}
      </div>
      {caption ? <div style={{ color: "#eee", fontSize: 14 }}>{caption}</div> : null}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ display: "flex", gap: 10, width: "100%", maxWidth: 520 }}
      >
        <input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (!sending) onSend(caption.trim());
            }
          }}
          placeholder="Add a caption..."
          autoFocus
          style={{
            flex: 1, border: "none", borderRadius: 24, padding: "12px 18px", fontSize: 15,
            background: "#233138", color: "#fff", outline: "none",
          }}
        />
        <button
          disabled={sending}
          onClick={() => onSend(caption.trim())}
          style={{
            background: "#25d366", color: "#fff", border: "none", borderRadius: "50%",
            width: 48, height: 48, fontSize: 18, cursor: "pointer", flexShrink: 0,
          }}
        >
          <i className={`fas ${sending ? "fa-spinner fa-spin" : "fa-paper-plane"}`} />
        </button>
      </div>
    </div>
  );
}

/* ---------- bottom action sheet ---------- */
export function Sheet({ items, onClose }) {
  return (
    <div className="wa-sheet-backdrop" onClick={onClose}>
      <div className="wa-sheet" onClick={(e) => e.stopPropagation()}>
        {items.map((it, i) => (
          <button key={i} onClick={() => { onClose(); it.onClick?.(); }}>
            {it.icon ? <i className={it.icon} /> : null}
            {it.label}
          </button>
        ))}
        <button className="cancel" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ---------- image preview popup ---------- */
const IV_CSS = `
.iv-back { position:fixed; inset:0; z-index:100500; background:rgba(8,12,16,.78); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px);
  display:flex; align-items:center; justify-content:center; padding:14px; animation:ivFade .15s ease-out; }
.iv-card { position:relative; background:#111b21; border-radius:16px; width:auto; max-width:min(94vw,920px); max-height:88vh;
  display:flex; flex-direction:column; overflow:hidden; box-shadow:0 24px 70px rgba(0,0,0,.55); animation:ivPop .18s cubic-bezier(.2,.9,.3,1.1); }
.iv-card img { max-width:min(94vw,920px); max-height:calc(88vh - 54px); width:auto; height:auto; object-fit:contain; display:block; background:#0b141a; }
.iv-x { position:absolute; top:10px; right:10px; width:38px; height:38px; border-radius:50%; border:0;
  background:rgba(0,0,0,.55); color:#fff; font-size:16px; cursor:pointer; z-index:2; display:flex; align-items:center; justify-content:center; }
.iv-x:hover { background:rgba(0,0,0,.85); }
.iv-open { position:absolute; top:10px; right:56px; width:38px; height:38px; border-radius:50%;
  background:rgba(0,0,0,.55); color:#fff; font-size:14px; display:flex; align-items:center; justify-content:center; text-decoration:none; z-index:2; }
.iv-open:hover { background:rgba(0,0,0,.85); }
.iv-cap { color:#e9edef; font-size:13.5px; padding:10px 16px; max-height:54px; overflow:auto; line-height:1.4; word-break:break-word; flex-shrink:0; }
@keyframes ivFade { from { opacity:0 } to { opacity:1 } }
@keyframes ivPop { from { opacity:0; transform:scale(.94) } to { opacity:1; transform:none } }
`;

export function ImageViewer({ src, caption, onClose }) {
  useEffect(() => {
    const f = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", f);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", f);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  if (!src) return null;
  return (
    <>
      <style>{IV_CSS}</style>
      <div className="iv-back" onClick={onClose} role="dialog" aria-modal="true" aria-label="Image preview">
        <div className="iv-card" onClick={(e) => e.stopPropagation()}>
          <button className="iv-x" onClick={onClose} aria-label="Close"><i className="fas fa-times" /></button>
          <a className="iv-open" href={src} target="_blank" rel="noreferrer" title="Open original" aria-label="Open original">
            <i className="fas fa-up-right-from-square" />
          </a>
          <img src={src} alt={caption || "image"} />
          {caption ? <div className="iv-cap">{caption}</div> : null}
        </div>
      </div>
    </>
  );
}
