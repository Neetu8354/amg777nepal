/* Cross-instance event bus.
   Local dev / single instance: in-memory pub-sub (globalThis map).
   Serverless + Supabase: events are ALSO relayed through a Supabase Realtime
   broadcast channel ("sg-live") so an emit in any function instance reaches
   SSE subscribers connected to any other instance. */

import { sb, remoteOn } from "@/lib/remote";
import crypto from "crypto";

const g = globalThis;
if (!g.__sgBus) g.__sgBus = new Map(); // channel -> Set<writeFn>
const bus = g.__sgBus;

/* shared across hot-reload module instances so self-emit dedup still works */
const INSTANCE = g.__sgInstance || (g.__sgInstance = crypto.randomBytes(8).toString("hex"));

export function subscribe(channel, fn) {
  if (!bus.has(channel)) bus.set(channel, new Set());
  bus.get(channel).add(fn);
  if (remoteOn) ensureRealtime();
  return () => {
    const s = bus.get(channel);
    if (s) { s.delete(fn); if (!s.size) bus.delete(channel); }
  };
}

function deliver(channel, type, payload) {
  const s = bus.get(channel);
  if (!s) return;
  const frame = `event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const fn of [...s]) {
    try { fn(frame); } catch { s.delete(fn); }
  }
}

/* ---------------- realtime relay ---------------- */

/* channel lives on globalThis: a hot reload must reuse it, else the old
   subscription keeps echoing broadcasts into the shared bus (duplicate SSE). */
function ensureRealtime() {
  if (g.__sgChan || !remoteOn) return;
  const chan = (g.__sgChan = sb.channel("sg-live", { config: { broadcast: { self: false } } }));
  chan.on("broadcast", { event: "sg" }, ({ payload }) => {
    if (!payload || payload.src === INSTANCE) return;
    deliver(payload.ch, payload.type, payload.data);
  });
  chan.subscribe((status, err) => {
    if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
      console.error("[bus] realtime:", err?.message || status);
      g.__sgChan = null; // retry on next subscribe/emit
      setTimeout(() => { if (!g.__sgChan) ensureRealtime(); }, 3000);
    }
  });
}
if (remoteOn) ensureRealtime();

export function emit(channel, type, payload) {
  deliver(channel, type, payload);
  if (!remoteOn) return;
  try {
    ensureRealtime();
    if (!g.__sgChan) return;
    // fire-and-forget broadcast
    g.__sgChan
      .send({ type: "broadcast", event: "sg", payload: { src: INSTANCE, ch: channel, type, data: payload } })
      .catch(() => {});
  } catch {}
}
