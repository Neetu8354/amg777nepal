import crypto from "crypto";
import {
  calls, emit, userCh, ADMIN_CH, adminOnline, userOnline, getUserById, pushToUser,
  endCallRecord, SUPPORT,
} from "@/lib/db";
import { remote, remoteOn } from "@/lib/remote";

const RING_MS = 30000;
const CONN_MS = 20000;

/* Expire stale calls lazily — serverless has no server-side timers. Called at
   the top of every callAction and periodically from SSE heartbeats. */
export async function expireCalls() {
  const stale = remoteOn
    ? await remote.callStale()
    : [...calls.values()].filter(
        (c) =>
          (c.status === "ringing" && Date.now() - c.createdAt > RING_MS) ||
          (c.status === "connecting" && Date.now() - c.createdAt > CONN_MS)
      );
  for (const c of stale) {
    emitPeer(c, "end", { reason: "missed" });
    await endCallRecord(c, "missed");
  }
  return stale.length;
}

function emitPeer(call, action, extra = {}) {
  const uid = call.user_id ?? call.userId;
  emit(userCh(uid), "call", { action, callId: call.id, userId: uid, ...extra });
  emit(ADMIN_CH, "call", { action, callId: call.id, userId: uid, ...extra });
  getUserById(uid).then((u) => {
    if (u?.agent_id) emit(`a:${u.agent_id}`, "call", { action, callId: call.id, userId: uid, ...extra });
  }).catch(() => {});
}

async function getCall(callId) {
  if (remoteOn) return remote.callGet(callId);
  return calls.get(callId) || null;
}

function saveCall(c) {
  if (remoteOn) remote.callUpsert({
    id: c.id, user_id: c.userId, initiator: c.initiator, status: c.status,
    created_ms: c.createdAt, connected_ms: c.connectedAt || null, meta: c.meta || null,
  });
  else calls.set(c.id, c);
}

export async function callAction(actor, user, body) {
  await expireCalls();
  const action = String(body.action || "");
  const callId = String(body.callId || "");
  const call = callId ? await getCall(callId) : null;
  // normalize remote row shape
  const C = call && remoteOn
    ? { id: call.id, userId: call.user_id, initiator: call.initiator, status: call.status, createdAt: call.created_ms, connectedAt: call.connected_ms || 0 }
    : call;

  switch (action) {
    case "start": {
      const userId = actor === "user" ? user.id : Number(body.userId);
      const target = await getUserById(userId);
      if (!target) return { success: false, error: "User not found" };
      const open = remoteOn ? await remote.callOpen(userId) : [...calls.values()].find(
        (c) => c.userId === userId && ["ringing", "connecting", "connected"].includes(c.status)
      );
      if (open) return { success: false, error: "Aap already call pe hain" };
      if (actor === "user" && !(await adminOnline())) {
        return { success: false, error: "Support is offline right now — please message us instead" };
      }
      if (actor === "admin" && !(await userOnline(userId))) {
        return { success: false, error: "User is offline" };
      }
      const c = {
        id: crypto.randomBytes(8).toString("hex"),
        userId,
        initiator: actor,
        status: "ringing",
        createdAt: Date.now(),
        connectedAt: 0,
      };
      saveCall(c);
      if (actor === "admin") pushToUser(userId, { title: "📞 Incoming call", body: `${SUPPORT.display_name} is calling you`, tag: "call", renotify: true });
      emitPeer(c, "incoming", {
        direction: actor === "user" ? "to-admin" : "to-user",
        fromName: actor === "user" ? target.display_name || target.mobile : SUPPORT.display_name,
        username: target.username,
        display_name: target.display_name,
        mobile: target.mobile,
      });
      return { success: true, callId: c.id };
    }

    case "accept": {
      if (!C || C.status !== "ringing") return { success: false, error: "Call not found" };
      if (actor === "user" && C.userId !== user.id) return { success: false, error: "Forbidden" };
      if (C.initiator === actor) return { success: false, error: "Caller cannot accept" };
      C.status = "connecting";
      C.createdAt = Date.now(); // restart window for the connecting guard
      saveCall(C);
      emitPeer(C, "accepted");
      return { success: true };
    }

    case "connected": {
      if (!C) return { success: false, error: "Call not found" };
      if (actor === "user" && C.userId !== user.id) return { success: false, error: "Forbidden" };
      if (C.status !== "connected") {
        C.status = "connected";
        C.connectedAt = Date.now();
        saveCall(C);
        emitPeer(C, "connected");
      }
      return { success: true };
    }

    case "decline": {
      if (!C || C.status !== "ringing") return { success: false, error: "Call not found" };
      if (actor === "user" && C.userId !== user.id) return { success: false, error: "Forbidden" };
      if (C.initiator === actor) return { success: false, error: "Caller cannot decline" };
      emitPeer(C, "declined");
      emitPeer(C, "end", { reason: "declined" });
      await endCallRecord(C, "declined");
      return { success: true };
    }

    case "end":
    case "cancel": {
      if (!C) return { success: true };
      if (actor === "user" && C.userId !== user.id) return { success: false, error: "Forbidden" };
      const status = C.status === "connected" ? "completed" : "missed";
      emitPeer(C, "end", { reason: action === "cancel" ? "cancelled" : "ended" });
      await endCallRecord(C, status);
      return { success: true };
    }

    case "signal": {
      if (!C) return { success: false, error: "Call not found" };
      if (actor === "user" && C.userId !== user.id) return { success: false, error: "Forbidden" };
      const data = body.data;
      if (actor === "user") emit(ADMIN_CH, "call", { action: "signal", callId: C.id, userId: C.userId, data });
      else emit(userCh(C.userId), "call", { action: "signal", callId: C.id, data });
      return { success: true };
    }

    case "meta": {
      if (!C) return { success: false, error: "Call not found" };
      if (actor === "user" && C.userId !== user.id) return { success: false, error: "Forbidden" };
      emitPeer(C, "meta", { held: !!body.held, muted: !!body.muted, by: actor });
      return { success: true };
    }

    default:
      return { success: false, error: "Unknown action" };
  }
}
