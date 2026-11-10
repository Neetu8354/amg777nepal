"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, avatarFor, fmtDur, ringtoneStart, ringtoneStop, outRingStart, outRingStop, osNotify } from "@/lib/client";

export const CALL_CSS = `
.call-ev { display:flex; align-items:center; gap:10px; background:#fff; border-radius:12px; padding:8px 12px; min-width:170px; max-width:280px; box-shadow:0 1px 1px rgba(0,0,0,.08); }
.call-ev.missed { background:#fff; }
.call-ev .call-ic { width:36px; height:36px; border-radius:50%; background:#25d366; color:#fff; display:flex; align-items:center; justify-content:center; font-size:14px; flex-shrink:0; }
.call-ev.missed .call-ic { background:#e74c3c; }
.call-ev.live .call-ic { background:#128c7e; animation:callPulse 1.4s ease-in-out infinite; }
@keyframes callPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
.call-title { font-size:14px; font-weight:600; color:#111; display:flex; align-items:center; gap:6px; }
.call-title .call-dir { font-size:11px; color:#25d366; }
.call-title .call-dir.out { transform:rotate(-45deg); }
.call-title .call-dir.in { transform:rotate(135deg); }
.call-ev.missed .call-title .call-dir { color:#e74c3c; }
.call-meta { font-size:11px; color:#667781; display:flex; gap:8px; margin-top:2px; }
.call-del { margin-left:auto; border:none; background:transparent; color:#8696a0; cursor:pointer; padding:6px; border-radius:50%; }
.call-del:hover { background:#f0f0f0; color:#e74c3c; }

.call-bg { position:fixed; inset:0; background:#0b141a; z-index:99999; display:flex; align-items:center; justify-content:center; padding:max(16px, env(safe-area-inset-top)) 16px max(16px, env(safe-area-inset-bottom)); overflow-y:auto; }
.call-box { color:#fff; text-align:center; max-width:420px; width:100%; margin:auto; }
.call-av { display:block; width:clamp(84px,26vw,112px); height:clamp(84px,26vw,112px); border-radius:50%; border:3px solid rgba(255,255,255,0.18); margin:0 auto clamp(12px,3vh,18px); object-fit:cover; }
.call-name { font-size:clamp(20px,6vw,26px); font-weight:500; margin-bottom:8px; overflow-wrap:anywhere; }
.call-status { font-size:15px; color:#8696a0; margin-bottom:12px; min-height:22px; letter-spacing:.3px; }
.call-status.hold { color:#25d366; font-weight:600; }
.call-note { display:inline-flex; align-items:center; gap:8px; background:rgba(255,255,255,0.08); color:#e9edef; font-size:13px; padding:7px 14px; border-radius:999px; margin-bottom:8px; max-width:100%; }
.call-note i { color:#f5b400; }
.call-gap { height:clamp(20px,5vh,36px); }
.call-actions { display:flex; gap:clamp(14px,6vw,28px); justify-content:center; flex-wrap:wrap; }
.call-actions button { border:none; border-radius:50%; width:clamp(54px,16vw,64px); height:clamp(54px,16vw,64px); font-size:clamp(19px,5.5vw,22px); cursor:pointer; color:#fff; display:flex; align-items:center; justify-content:center; transition:transform .15s, background .15s; }
.call-actions button:hover { transform:scale(1.06); }
.call-lab { display:flex; flex-direction:column; align-items:center; gap:8px; min-width:64px; }
.call-lab span { font-size:12px; color:#8696a0; }
.accept { background:#25d366; }
.decline, .end { background:#e74c3c; }
.mute, .hold { background:#233138; }
.mute.on, .hold.on { background:#fff; color:#111; }
@media (max-height:480px) {
  .call-av { width:64px; height:64px; margin-bottom:8px; }
  .call-name { font-size:19px; margin-bottom:4px; }
  .call-gap { height:14px; }
}
.call-bg.pop { background:rgba(8,12,16,0.32); backdrop-filter:blur(10px) saturate(120%); -webkit-backdrop-filter:blur(10px) saturate(120%); cursor:pointer; animation:callFade .18s ease-out; }
.call-bg.pop .call-box { position:relative; cursor:default; max-width:380px; margin:auto; padding:30px 22px 24px; border-radius:24px;
  background:linear-gradient(165deg,#2a3942 0%,#152028 55%,#0b141a 100%); border:1px solid rgba(255,255,255,0.08);
  box-shadow:0 30px 80px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06); animation:callPop .24s cubic-bezier(.2,.9,.3,1.15); }
.call-bg.pop .call-av { width:96px; height:96px; }
.call-bg.pop .call-av.ring { animation:callRing 1.6s ease-out infinite; }
.call-bg.pop .call-name { font-size:22px; }
.call-bg.pop .call-gap { height:22px; }
.call-bg.pop .call-actions { gap:22px; }
.call-bg.pop .call-actions button { width:58px; height:58px; font-size:20px; box-shadow:0 8px 20px rgba(0,0,0,.3); }
.call-min { position:absolute; top:12px; right:12px; width:34px; height:34px; border-radius:50%; border:none; background:rgba(255,255,255,.1); color:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:13px; transition:background .15s; }
.call-min:hover { background:rgba(255,255,255,.2); }
@keyframes callFade { from { opacity:0 } to { opacity:1 } }
@keyframes callPop { from { opacity:0; transform:translateY(12px) scale(.96) } to { opacity:1; transform:none } }
@keyframes callRing { 0% { box-shadow:0 0 0 0 rgba(37,211,102,.45) } 70% { box-shadow:0 0 0 20px rgba(37,211,102,0) } 100% { box-shadow:0 0 0 0 rgba(37,211,102,0) } }

.cm-card { position:fixed; z-index:100300; width:min(320px,calc(100vw - 32px)); display:flex; align-items:center; gap:10px;
  padding:10px 10px 10px 12px; border-radius:16px; color:#fff; background:rgba(17,27,33,.92);
  backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px); box-shadow:0 10px 30px rgba(0,0,0,.35),0 0 0 1px rgba(255,255,255,.06);
  cursor:grab; touch-action:none; user-select:none; animation:cmIn .18s ease-out; transition:left .18s ease, top .18s ease; }
.cm-card.dragging { cursor:grabbing; transition:none; }
.cm-card.ringing { box-shadow:0 10px 30px rgba(0,0,0,.35),0 0 0 2px #25d366; animation:cmIn .18s ease-out, cmRing 1.4s ease-in-out infinite; }
.cm-av { width:42px; height:42px; border-radius:50%; object-fit:cover; flex-shrink:0; border:2px solid rgba(255,255,255,.15); pointer-events:none; }
.cm-info { flex:1; min-width:0; line-height:1.25; }
.cm-name { font-size:14px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.cm-status { font-size:12px; color:#8696a0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.cm-status.hl { color:#25d366; font-weight:600; }
.cm-note { font-size:11px; color:#f5b400; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.cm-btns { display:flex; gap:6px; flex-shrink:0; }
.cm-btns button { width:36px; height:36px; border-radius:50%; border:none; color:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:14px; background:#233138; }
.cm-btns button:hover { filter:brightness(1.15); }
.cm-btns .on { background:#fff; color:#111; }
.cm-btns .red { background:#e74c3c; }
.cm-btns .green { background:#25d366; }
@keyframes cmIn { from { opacity:0; transform:scale(.92) } to { opacity:1; transform:none } }
@keyframes cmRing { 0%,100% { box-shadow:0 10px 30px rgba(0,0,0,.35),0 0 0 2px #25d366 } 50% { box-shadow:0 10px 30px rgba(0,0,0,.35),0 0 0 6px rgba(37,211,102,.35) } }
`;

function remoteAudioEl() {
  let el = document.getElementById("remote-call-audio");
  if (!el) {
    el = document.createElement("audio");
    el.id = "remote-call-audio";
    el.autoplay = true;
    el.setAttribute("playsinline", "true");
    el.style.position = "fixed";
    el.style.left = "-9999px";
    document.body.appendChild(el);
  }
  return el;
}

const idleState = {
  active: false, direction: null, status: "idle", callId: null, peerLabel: "",
  muted: false, held: false, remoteHeld: false, remoteMuted: false,
  startTime: null, reconnecting: false,
};

export function useVoiceCall({ actor, endpoint, onPeer }) {
  const [state, setState] = useState(idleState);
  const st = useRef(idleState);
  const pc = useRef(null);
  const stream = useRef(null);
  const pendingSignals = useRef([]);
  const connectedSent = useRef(false);
  const set = (p) => {
    st.current = { ...st.current, ...p };
    setState(st.current);
  };

  const post = useCallback(
    (body) => api(endpoint, { method: "POST", body }).then((r) => r.data),
    [endpoint]
  );

  const cleanup = useCallback(() => {
    try { pc.current?.close(); } catch {}
    pc.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    pendingSignals.current = [];
    connectedSent.current = false;
    ringtoneStop();
    outRingStop();
  }, []);

  const makePeer = useCallback(async () => {
    const peer = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    pc.current = peer;
    peer.onicecandidate = (e) => {
      if (e.candidate) post({ action: "signal", callId: st.current.callId, data: { ice: e.candidate.toJSON() } });
    };
    peer.ontrack = (e) => {
      const a = remoteAudioEl();
      a.srcObject = e.streams[0];
      a.play?.().catch(() => {});
    };
    peer.onconnectionstatechange = () => {
      const s = peer.connectionState;
      if (s === "connected" && !connectedSent.current) {
        connectedSent.current = true;
        post({ action: "connected", callId: st.current.callId });
      }
      if (s === "disconnected" || s === "failed") {
        if (st.current.status === "connected" || st.current.status === "connecting") {
          set({ status: "connecting", reconnecting: true });
        }
      }
      if (s === "connected") set({ status: "connected", startTime: st.current.startTime || Date.now(), reconnecting: false });
    };
    if (!stream.current) {
      try {
        stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        // No mic / permission denied — join muted so the call still connects.
        stream.current = null;
        set({ muted: true });
      }
    }
    if (stream.current) {
      stream.current.getTracks().forEach((t) => {
        t.enabled = !st.current.muted;
        peer.addTrack(t, stream.current);
      });
    } else {
      peer.addTransceiver("audio", { direction: "recvonly" });
    }
    return peer;
  }, [post]);

  const handleSignal = useCallback(
    async (data) => {
      const peer = pc.current;
      if (!peer) {
        pendingSignals.current.push(data);
        return;
      }
      try {
        if (data?.sdp) {
          await peer.setRemoteDescription(data.sdp);
          if (data.sdp.type === "offer") {
            const ans = await peer.createAnswer();
            await peer.setLocalDescription(ans);
            post({ action: "signal", callId: st.current.callId, data: { sdp: peer.localDescription } });
          }
        } else if (data?.ice) {
          await peer.addIceCandidate(data.ice).catch(() => {});
        }
      } catch {}
    },
    [post]
  );

  const flushSignals = useCallback(async () => {
    const q = pendingSignals.current.splice(0);
    for (const d of q) await handleSignal(d);
  }, [handleSignal]);

  const start = useCallback(
    async (userId) => {
      if (st.current.active) return { error: "Aap already call pe hain" };
      if (!navigator.mediaDevices?.getUserMedia) return { error: "Voice calls are not supported in this browser" };
      const r = await post({ action: "start", ...(actor === "admin" ? { userId } : {}) });
      if (!r?.success) return { error: r?.error || "Call connect nahi hua" };
      set({
        ...idleState, active: true, direction: "outgoing", status: "ringing",
        callId: r.callId, peerLabel: "",
      });
      outRingStart();
      return { ok: true };
    },
    [actor, post]
  );

  const accept = useCallback(async () => {
    if (st.current.direction !== "incoming" || st.current.status !== "ringing") return;
    ringtoneStop();
    set({ status: "connecting" });
    // Build the PC BEFORE telling the caller, so its offer can't arrive early.
    await makePeer();
    await flushSignals();
    await post({ action: "accept", callId: st.current.callId });
  }, [post, makePeer, flushSignals]);

  const decline = useCallback(async () => {
    await post({ action: "decline", callId: st.current.callId });
    cleanup();
    set({ ...idleState, active: true, status: "declined", direction: st.current.direction });
    setTimeout(() => set(idleState), 1600);
  }, [post, cleanup]);

  const end = useCallback(async () => {
    const s = st.current;
    if (!s.callId) return;
    await post({ action: s.status === "ringing" ? "cancel" : "end", callId: s.callId });
    cleanup();
    set({ ...idleState, active: true, status: "ended", direction: s.direction });
    setTimeout(() => set(idleState), 1200);
  }, [post, cleanup]);

  const toggleMute = useCallback(() => {
    const muted = !st.current.muted;
    stream.current?.getAudioTracks().forEach((t) => (t.enabled = !muted));
    set({ muted });
    post({ action: "meta", callId: st.current.callId, muted });
  }, [post]);

  const toggleHold = useCallback(() => {
    const held = !st.current.held;
    stream.current?.getAudioTracks().forEach((t) => (t.enabled = !held && !st.current.muted));
    const a = document.getElementById("remote-call-audio");
    if (a) a.muted = held;
    set({ held });
    post({ action: "meta", callId: st.current.callId, held });
  }, [post]);

  // Feed SSE 'call' payloads here
  const onEvent = useCallback(
    async (p) => {
      const s = st.current;
      switch (p.action) {
        case "incoming": {
          // only the callee side reacts
          const mine =
            (actor === "user" && p.direction === "to-user") ||
            (actor === "admin" && p.direction === "to-admin");
          if (!mine || s.active) return;
          set({
            ...idleState, active: true, direction: "incoming", status: "ringing",
            callId: p.callId, peerLabel: p.fromName || p.mobile || p.username || "Support",
            peerUserId: p.userId,
          });
          ringtoneStart();
          osNotify("📞 Incoming call", `${p.fromName || p.display_name || p.mobile || "Support"} is calling`, `call-${p.callId}`);
          onPeer?.(p);
          break;
        }
        case "accepted": {
          if (p.callId !== s.callId || s.direction !== "outgoing") return;
          outRingStop();
          set({ status: "connecting" });
          // caller offers
          const peer = await makePeer();
          await flushSignals();
          const offer = await peer.createOffer();
          await peer.setLocalDescription(offer);
          post({ action: "signal", callId: s.callId, data: { sdp: peer.localDescription } });
          break;
        }
        case "signal": {
          if (p.callId !== s.callId) return;
          await handleSignal(p.data);
          break;
        }
        case "connected": {
          if (p.callId !== s.callId) return;
          outRingStop();
          ringtoneStop();
          if (s.status !== "connected") set({ status: "connected", startTime: s.startTime || Date.now(), reconnecting: false });
          break;
        }
        case "meta": {
          if (p.callId !== s.callId) return;
          const mine = p.by === actor;
          if (!mine) set({ remoteHeld: p.held ?? st.current.remoteHeld, remoteMuted: p.muted ?? st.current.remoteMuted });
          break;
        }
        case "declined": {
          if (p.callId !== s.callId) return;
          cleanup();
          set({ ...idleState, active: true, status: "declined", direction: s.direction });
          setTimeout(() => set(idleState), 1600);
          break;
        }
        case "timeout":
        case "end": {
          if (p.callId !== s.callId) return;
          const wasConnected = s.status === "connected" || s.status === "connecting";
          cleanup();
          set({ ...idleState, active: true, status: "ended", direction: s.direction });
          setTimeout(() => set(idleState), wasConnected ? 1200 : 1600);
          break;
        }
      }
    },
    [actor, cleanup, makePeer, post, onPeer, handleSignal, flushSignals]
  );

  useEffect(() => () => cleanup(), [cleanup]);

  return { state, start, accept, decline, end, toggleMute, toggleHold, onEvent };
}

/* ---------- overlay + mini card ---------- */

function statusText(e, secs) {
  const held = e.held || e.remoteHeld;
  if (e.status === "ringing") return e.direction === "incoming" ? "Incoming voice call" : "Calling…";
  if (e.status === "connecting") return e.reconnecting ? "Reconnecting…" : "Connecting…";
  if (e.status === "connected" && held) return "On hold";
  if (e.status === "connected") return fmtDur(secs);
  if (e.status === "declined") return e.direction === "outgoing" ? "Call declined" : "Declined";
  if (e.status === "ended") return "Call ended";
  return "";
}

export function CallOverlay({ state, avatar, onAccept, onDecline, onEnd, onMute, onHold, minimizable = false }) {
  const [mini, setMini] = useState(false);
  const [secs, setSecs] = useState(0);

  useEffect(() => {
    if (!state.active || (state.direction !== "incoming" || state.status !== "ringing")) return;
    setMini(false);
  }, [state.active, state.direction, state.status]);

  useEffect(() => {
    if (!minimizable || !state.active || mini) return;
    const f = (e) => e.key === "Escape" && setMini(true);
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [minimizable, state.active, mini]);

  useEffect(() => {
    if (state.status !== "connected" || !state.startTime || state.held || state.remoteHeld) return;
    const t = setInterval(() => setSecs(Math.floor((Date.now() - state.startTime) / 1000)), 1000);
    return () => clearInterval(t);
  }, [state.status, state.startTime, state.held, state.remoteHeld]);

  if (!state.active) return null;
  if (state.status === "ended" || state.status === "declined") {
    // brief closing card
  }

  const label = state.peerLabel || "Support";
  const av = avatar || avatarFor(label);
  const text = statusText(state, secs);
  const live = state.status === "connected" || state.status === "connecting";
  const note =
    state.remoteHeld ? `${label} put the call on hold` : state.remoteMuted ? `${label} muted their mic` : null;

  if (mini) {
    return (
      <CallMini
        name={label}
        avatarSrc={av}
        statusText={text}
        highlight={state.status === "ringing"}
        phase={state.direction === "incoming" && state.status === "ringing" ? "incoming" : "live"}
        muted={state.muted}
        onMute={onMute}
        onAccept={onAccept}
        onDecline={onDecline}
        onEnd={onEnd}
        onExpand={() => setMini(false)}
      />
    );
  }

  return (
    <div
      className={`call-bg ${minimizable ? "pop" : ""}`}
      onClick={minimizable ? (e) => e.target === e.currentTarget && setMini(true) : undefined}
    >
      <div className="call-box">
        {minimizable && (
          <button className="call-min" onClick={() => setMini(true)} title="Minimize (Esc or click outside)" aria-label="Minimize call">
            <i className="fas fa-compress-alt" />
          </button>
        )}
        <img className={`call-av ${state.status === "ringing" ? "ring" : ""}`} src={av} alt="" />
        <div className="call-name">{label}</div>
        <div className={`call-status ${state.held || state.remoteHeld ? "hold" : ""}`}>{text}</div>
        {note && live && (
          <div className="call-note">
            <i className={`fas fa-${state.remoteHeld ? "pause" : "microphone-slash"}`} />
            {note}
          </div>
        )}
        <div className="call-gap" />
        <div className="call-actions">
          {state.direction === "incoming" && state.status === "ringing" && (
            <>
              <div className="call-lab">
                <button className="decline" onClick={onDecline} title="Decline">
                  <i className="fas fa-phone-slash" />
                </button>
                <span>Decline</span>
              </div>
              <div className="call-lab">
                <button className="accept" onClick={onAccept} title="Accept">
                  <i className="fas fa-phone" />
                </button>
                <span>Accept</span>
              </div>
            </>
          )}
          {state.direction === "outgoing" && state.status === "ringing" && (
            <div className="call-lab">
              <button className="end" onClick={onEnd} title="Cancel">
                <i className="fas fa-phone-slash" />
              </button>
              <span>Cancel</span>
            </div>
          )}
          {live && (
            <>
              <div className="call-lab">
                <button className={`mute ${state.muted ? "on" : ""}`} onClick={onMute} title={state.muted ? "Unmute" : "Mute"}>
                  <i className={`fas fa-microphone${state.muted ? "-slash" : ""}`} />
                </button>
                <span>{state.muted ? "Unmute" : "Mute"}</span>
              </div>
              <div className="call-lab">
                <button className={`hold ${state.held ? "on" : ""}`} onClick={onHold} title={state.held ? "Resume" : "Hold"}>
                  <i className={`fas fa-${state.held ? "play" : "pause"}`} />
                </button>
                <span>{state.held ? "Resume" : "Hold"}</span>
              </div>
              <div className="call-lab">
                <button className="end" onClick={onEnd} title="End call">
                  <i className="fas fa-phone-slash" />
                </button>
                <span>End</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function CallMini({ name, avatarSrc, statusText, note, highlight, phase, muted, onMute, onAccept, onDecline, onEnd, onExpand }) {
  const ref = useRef(null);
  const [pos, setPos] = useState(null);
  const [drag, setDrag] = useState(false);

  const onDown = (e) => {
    if (e.target.closest("button")) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const startX = e.clientX - r.left;
    const startY = e.clientY - r.top;
    setDrag(true);
    const move = (ev) => setPos({ x: ev.clientX - startX, y: ev.clientY - startY });
    const up = () => {
      setDrag(false);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <div
      ref={ref}
      className={`cm-card ${drag ? "dragging" : ""} ${phase === "incoming" ? "ringing" : ""}`}
      style={pos ? { left: pos.x, top: pos.y } : { right: 16, bottom: 16 }}
      onPointerDown={onDown}
    >
      <img className="cm-av" src={avatarSrc} alt="" draggable={false} />
      <div className="cm-info">
        <div className="cm-name">{name}</div>
        <div className={`cm-status ${highlight ? "hl" : ""}`}>{statusText || "Call in progress"}</div>
        {note ? <div className="cm-note">{note}</div> : null}
      </div>
      <div className="cm-btns">
        {phase === "incoming" ? (
          <>
            <button className="red" onClick={onDecline} title="Decline" aria-label="Decline">
              <i className="fas fa-phone-slash" />
            </button>
            <button className="green" onClick={onAccept} title="Accept" aria-label="Accept">
              <i className="fas fa-phone" />
            </button>
          </>
        ) : (
          <>
            <button className={muted ? "on" : ""} onClick={onMute} title={muted ? "Unmute" : "Mute"} aria-label="Mute">
              <i className={`fas fa-microphone${muted ? "-slash" : ""}`} />
            </button>
            <button className="red" onClick={onEnd} title="End" aria-label="End call">
              <i className="fas fa-phone-slash" />
            </button>
          </>
        )}
        <button onClick={onExpand} title="Full screen" aria-label="Open full call screen">
          <i className="fas fa-expand-alt" />
        </button>
      </div>
    </div>
  );
}
