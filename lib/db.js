import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import { cookies } from "next/headers";
import { remote, remoteOn, kv, nextId } from "@/lib/remote";

/* Storage dir: ./data locally, /tmp on serverless (fs is read-only except /tmp). */
const IS_SERVERLESS = !!process.env.VERCEL;
const DATA_DIR = path.join(IS_SERVERLESS ? os.tmpdir() : process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
try { for (const d of [DATA_DIR, UPLOAD_DIR]) fs.mkdirSync(d, { recursive: true }); } catch {}

/* ---------------- persistent state (local mode) ---------------- */

function blank() {
  return {
    seq: 1,
    users: {},
    sessions: {},
    adminSessions: {},
    messages: {},
    subs: {},
    adminSubs: [],
    visits: [],
  };
}

function load() {
  try {
    const raw = fs.readFileSync(DB_FILE, "utf8");
    return { ...blank(), ...JSON.parse(raw) };
  } catch {
    return blank();
  }
}

const g = globalThis;
if (!g.__sgDb) {
  g.__sgDb = remoteOn ? blank() : load(); // remote mode: db.json is not the source of truth
  g.__sgDbDirty = false;
  try {
    setInterval(() => {
      if (!g.__sgDbDirty) return;
      g.__sgDbDirty = false;
      try { fs.writeFileSync(DB_FILE, JSON.stringify(g.__sgDb)); } catch {}
    }, 1500).unref?.();
  } catch {}
}
export const db = g.__sgDb;
export function save() { g.__sgDbDirty = true; }

export const SUPPORT = {
  display_name: "Billy777 Customer Support",
  avatar_url: "/app/icon-192.png?v=3",
};

export const AUTO_REPLY = process.env.SG_AUTOREPLY !== "0";
export const ADMIN_USER = process.env.SG_ADMIN_USER || "admin";
export const ADMIN_PASS = process.env.SG_ADMIN_PASS || "sprinter123";

/* ---------------- event bus (local + supabase realtime relay) ---------------- */

export { subscribe, emit } from "@/lib/bus";
import { emit } from "@/lib/bus";

export const userCh = (id) => `u:${id}`;
export const ADMIN_CH = "admin";

/* ---------------- users / sessions ---------------- */

export async function findUserByMobile(mobile) {
  if (remoteOn) return remote.userByMobile(mobile);
  return Object.values(db.users).find((u) => u.mobile === mobile) || null;
}

export async function getUserById(id) {
  if (remoteOn) return remote.userById(id);
  return db.users[id] || null;
}

export async function createUser(mobile, deviceId, cc) {
  cc = "91"; // India only
  const { agentForCc } = await import("@/lib/agents");
  const agent = await agentForCc(cc);
  const id = remoteOn ? await nextId() : db.seq++;
  const user = {
    id,
    mobile,
    cc,
    username: `u${cc}${mobile}`,
    device_id: deviceId || null,
    display_name: `+${cc} ${mobile}`,
    created_at: new Date().toISOString(),
    blocked: false,
    last_seen: null,
    online: 0,
    agent_id: agent?.id ?? null,
  };
  if (remoteOn) {
    const saved = await remote.insertUser(user);
    return saved || user;
  }
  db.users[id] = user;
  db.messages[id] = [];
  save();
  return user;
}

export async function newSession(userId) {
  const token = crypto.randomBytes(24).toString("hex");
  // await the upsert: the client can hit the next route before a fire-and-forget
  // write lands, and a failed lookup would then be cached as "no session"
  if (remoteOn) await remote.upsertSession(token, userId);
  else { db.sessions[token] = userId; save(); }
  return token;
}

export async function newAdminSession(agentId) {
  const token = crypto.randomBytes(24).toString("hex");
  if (remoteOn) await remote.upsertAdminSession(token, agentId ?? null);
  else { db.adminSessions[token] = { at: Date.now(), agentId: agentId ?? null }; save(); }
  return token;
}

/* short-lived session caches — sessions change rarely, saves a DB hit per request.
   globalThis-backed so dev hot-reload module instances share one cache. */
const sessCache = g.__sgSessCache || (g.__sgSessCache = new Map());
const SESS_TTL = 30000;
function cachedGet(map, key) {
  const e = map.get(key);
  if (e && e.exp > Date.now()) return e.v;
  map.delete(key);
  return undefined;
}
function cachedSet(map, key, v) {
  map.set(key, { v, exp: Date.now() + SESS_TTL });
}

export async function getUser() {
  const c = await cookies();
  const t = c.get("sg_session")?.value;
  if (!t) return null;
  return getUserByToken(t);
}

export async function getUserByToken(t) {
  if (remoteOn) {
    const c = cachedGet(sessCache, t);
    if (c !== undefined) return c;
    const u = await remote.sessionUser(t);
    cachedSet(sessCache, t, u);
    return u;
  }
  const id = db.sessions[t];
  return (id && db.users[id]) || null;
}

/* drop cached session→user entries so block/profile changes take effect now */
export function invalidateUserSessions(userId) {
  for (const [k, e] of sessCache) if (e.v?.id === userId) sessCache.delete(k);
}

/* admin sessions cache under "a:<token>" — drop on logout/agent revoke */
export function invalidateAdminSession(t) {
  sessCache.delete("a:" + t);
}

/* Block enforcement can't trust the session cache: entries are up to SESS_TTL
   stale and other serverless instances can't be invalidated — read the row. */
export async function userIsBlocked(u) {
  if (!u) return false;
  if (!remoteOn) return !!u.blocked;
  const fresh = await remote.userById(u.id);
  return !!fresh?.blocked;
}

export async function isAdmin() {
  const c = await cookies();
  const t = c.get("sg_admin")?.value;
  return isAdminToken(t);
}

/* Returns { main: true } for the super-admin or { main:false, agent } for an
   agent session; null when not authenticated. */
export async function getAdmin() {
  const c = await cookies();
  const t = c.get("sg_admin")?.value;
  if (!t || !(await isAdminToken(t))) return null;
  let agentId = null;
  if (remoteOn) agentId = await remote.adminSessionAgent(t);
  else agentId = db.adminSessions[t]?.agentId ?? null;
  if (!agentId) return { main: true, agent: null };
  const { listAgents } = await import("@/lib/agents");
  const agent = (await listAgents()).find((a) => a.id === agentId) || null;
  return { main: false, agent };
}

/* emit to the shared admin channel + the user's assigned agent channel so both
   main admin and the routed agent receive the event */
export function emitToAdmins(user, type, payload) {
  emit(ADMIN_CH, type, payload);
  if (user?.agent_id) emit(`a:${user.agent_id}`, type, payload);
}

/* main admin sees everyone; agents only users routed to them */
export function adminCanAccess(admin, user) {
  return !!admin && (admin.main || (admin.agent && user?.agent_id === admin.agent.id));
}

export async function isAdminToken(t) {
  if (!t) return false;
  if (remoteOn) {
    const c = cachedGet(sessCache, "a:" + t);
    if (c !== undefined) return c;
    const ok = await remote.adminSessionOk(t);
    cachedSet(sessCache, "a:" + t, ok);
    return ok;
  }
  return !!(t && db.adminSessions[t]);
}

export async function killSession() {
  const c = await cookies();
  const t = c.get("sg_session")?.value;
  if (!t) return;
  if (remoteOn) { await remote.deleteSession(t); sessCache.delete(t); }
  else { delete db.sessions[t]; save(); }
}

/* ---------------- messages ---------------- */

export async function listMessages(userId) {
  if (remoteOn) return remote.messagesOf(userId);
  return db.messages[userId] || [];
}

export async function allMessages() {
  if (remoteOn) return remote.allMessages();
  return Object.values(db.messages).flat();
}

/* once migrate-v6 sets the id column default, inserts are ONE query — the
   rpc sg_next_id round trip is skipped. Probed once, then remembered. */
export async function addMessage(userId, msg) {
  const m = {
    id: remoteOn ? null : db.seq++,
    sender: msg.sender,
    username: msg.username || "",
    message: msg.message ?? "",
    image: msg.image || null,
    audio_file: msg.audio_file || null,
    video_file: msg.video_file || null,
    type: msg.type || "text",
    reply_to: msg.reply_to ?? null,
    link_preview: msg.link_preview ?? null,
    created_at: new Date().toISOString(),
    edited_at: null,
    is_delivered: 0,
    read_at: null,
  };
  if (remoteOn) {
    if (g.__sgDbMsgIds !== false) {
      const r = await remote.insertMessage(userId, m); // id null → column default
      if (r?.id) { g.__sgDbMsgIds = true; return r; }
      g.__sgDbMsgIds = false; // migration not run — fall back to rpc ids
    }
    m.id = await nextId();
    return (await remote.insertMessage(userId, m)) || m;
  }
  if (!db.messages[userId]) db.messages[userId] = [];
  db.messages[userId].push(m);
  save();
  return m;
}

export async function patchMessage(userId, id, patch) {
  if (remoteOn) return remote.patchMessage(userId, id, patch);
  const m = (db.messages[userId] || []).find((x) => x.id === id);
  if (!m) return null;
  Object.assign(m, patch);
  save();
  return m;
}

export async function deleteMessage(userId, id) {
  if (remoteOn) return remote.deleteMessage(userId, id);
  const arr = db.messages[userId] || [];
  const i = arr.findIndex((x) => x.id === id);
  if (i < 0) return null;
  const [m] = arr.splice(i, 1);
  save();
  return m;
}

/* ---------------- presence ---------------- */
/* Local: a connection is "online" while its SSE writer is subscribed.
   Remote: sg_presence rows (one per SSE connection, heartbeat keeps `at` fresh). */

export async function adminOnline() {
  if (remoteOn) return (await remote.presenceCount("admin")) > 0;
  const bus = g.__sgBus;
  return (bus?.get(ADMIN_CH)?.size || 0) > 0;
}

export async function userOnline(id) {
  if (remoteOn) return (await remote.presenceCount("user", id)) > 0;
  const bus = g.__sgBus;
  return (bus?.get(userCh(id))?.size || 0) > 0;
}

export async function onlineUserIds() {
  if (remoteOn) return remote.presenceOnlineIds("user");
  const bus = g.__sgBus;
  const ids = new Set();
  for (const k of bus?.keys() || []) {
    if (k.startsWith("u:")) ids.add(Number(k.slice(2)));
  }
  return ids;
}

export async function adminLastSeen() {
  if (remoteOn) return remote.adminLastSeen() || (await kv.get("admin_last_seen"));
  return db.admin_last_seen || null;
}

export async function presenceJoin(kind, userId) {
  const key = crypto.randomBytes(10).toString("hex");
  if (remoteOn) await remote.presenceJoin(key, kind, userId);
  return key;
}

export function presenceBeat(key) {
  if (remoteOn) remote.presenceBeat(key);
}

export function presenceLeave(key) {
  if (remoteOn) remote.presenceLeave(key);
}

export async function userConnected(id) {
  const u = await getUserById(id);
  if (u) {
    u.last_seen = new Date().toISOString();
    if (remoteOn) remote.patchUser(id, { last_seen: u.last_seen });
    else save();
  }
  emitToAdmins(u, "presence", { userId: id, online: true });
  const adm = await adminOnline();
  for (const uid of await onlineUserIds()) {
    emit(userCh(uid), "presence", { by: "admins", online: adm });
  }
}

export async function userDisconnected(id) {
  const u = await getUserById(id);
  if (u) {
    u.last_seen = new Date().toISOString();
    if (remoteOn) remote.patchUser(id, { last_seen: u.last_seen });
    else save();
  }
  emitToAdmins(u, "presence", { userId: id, online: false });
}

export async function adminConnected() {
  for (const uid of await onlineUserIds()) {
    emit(userCh(uid), "presence", { by: "admins", online: true });
  }
  emit(ADMIN_CH, "presence", { by: "admins", online: true });
}

export async function adminDisconnected() {
  if (await adminOnline()) return;
  const now = new Date().toISOString();
  if (remoteOn) kv.set("admin_last_seen", now);
  else { db.admin_last_seen = now; save(); }
  for (const uid of await onlineUserIds()) {
    emit(userCh(uid), "presence", { by: "admins", online: false });
  }
}

/* ---------------- calls ---------------- */

if (!g.__sgCalls) g.__sgCalls = new Map(); // local-mode call map; remote mode uses sg_calls
export const calls = g.__sgCalls;

export async function endCallRecord(call, status) {
  const duration = call.connected_ms || call.connectedAt
    ? Math.floor((Date.now() - (call.connected_ms || call.connectedAt)) / 1000)
    : 0;
  await addMessage(call.user_id ?? call.userId, {
    sender: call.initiator === "user" ? "user" : "admin",
    type: "call",
    message: JSON.stringify({ status, duration, initiator: call.initiator }),
  });
  const uid = call.user_id ?? call.userId;
  const last = (await listMessages(uid)).slice(-1)[0];
  emit(userCh(uid), "message", { message: last });
  const cu = await getUserById(uid);
  emitToAdmins(cu, "message", { userId: uid, message: last });
  if (remoteOn) remote.callDelete(call.id);
  else calls.delete(call.id);
}

/* ---------------- auto-reply bot ---------------- */

const BOT_REPLIES = [
  [/^(hi+|hello+|hey+|hii+|namaste|good (morning|evening|afternoon))\b/i, "Hello! 👋 Welcome to Billy777 customer support. How can we help you today?"],
  [/price|cost|rate|charge|fee/i, "For pricing details, please share what service you need and our team will confirm the exact charges right away. 💰"],
  [/book|order|booking/i, "Sure! Please share your pickup and drop location, and we'll get your booking started. 📦"],
  [/time|when|delivery|deliver|reach/i, "Our team will confirm the exact time shortly. Could you share your order or booking details?"],
  [/thank|thanks|shukriya|dhanyavad/i, "You're most welcome! 😊 Anything else we can help you with?"],
  [/problem|issue|error|not working|help/i, "Sorry to hear that. Please describe the issue in detail (a screenshot helps too) — our team is on it. 🛠️"],
  [/call|phone|baat/i, "You can tap the Call button at the top and an agent will pick up when available. 📞"],
  [/cancel|refund|return/i, "Please share your order ID and we'll process your cancellation/refund request right away."],
];
const BOT_FALLBACK = [
  "Thanks for reaching out! An agent will reply shortly. Meanwhile, please share any details that can help. 🙏",
  "Got it! Our support team has received your message and will respond shortly. ✅",
  "Thanks! We're checking this for you — one moment please. ⏳",
];
let botIdx = 0;

/* schedule(fn, ms): serverless-safe delayed work — uses Next's `after` when
   inside a request, plain setTimeout otherwise (also used locally). */
import { after } from "next/server";
export function schedule(fn, ms) {
  try {
    after(async () => { await new Promise((r) => setTimeout(r, ms)); await fn(); });
  } catch {
    setTimeout(fn, ms);
  }
}

const WELCOME_MSG = "Hi! 👋 Welcome to Billy777 customer support. How can we help you today?";
if (!g.__sgWelcome) g.__sgWelcome = new Set(); // userIds already scheduled — avoids double-welcome on rapid first messages

/* delayed bot/admin reply with typing indicator; welcomeOnly aborts the send if
   an agent (or another welcome) already replied during the typing delay */
function botSay(userId, text, { welcomeOnly = false } = {}) {
  emit(userCh(userId), "typing", { by: "admin", is_typing: true });
  schedule(async () => {
    emit(userCh(userId), "typing", { by: "admin", is_typing: false });
    if (welcomeOnly) {
      const hasAdmin = remoteOn
        ? (await remote.countMessages(userId, "admin")) > 0
        : (db.messages[userId] || []).some((m) => m.sender === "admin");
      if (hasAdmin) return;
    }
    const m = await addMessage(userId, {
      sender: "admin",
      username: "support",
      message: text,
    });
    m.is_delivered = (await userOnline(userId)) ? 1 : 0;
    if (remoteOn) remote.patchMessage(userId, m.id, { is_delivered: m.is_delivered });
    emit(userCh(userId), "message", { message: m });
    const au = await getUserById(userId);
    emitToAdmins(au, "message", { userId, message: m });
    pushToUser(userId, { title: SUPPORT.display_name, body: text });
  }, 1800 + Math.random() * 2200);
}

/* callers pass the message they just stored — no full-history fetch needed */
export async function maybeAutoReply(userId, last) {
  if (!last && !remoteOn) {
    const msgs = db.messages[userId] || [];
    last = msgs[msgs.length - 1];
  }
  if (!last || last.sender !== "user") return;

  /* first-ever user message → welcome greeting, even when an admin is online.
     Afterwards agents reply themselves; the bot only fills in when nobody is. */
  const first = remoteOn
    ? (await remote.countMessages(userId, "user")) === 1 &&
      !(await remote.countMessages(userId, "admin"))
    : !(db.messages[userId] || []).some((m) => m.sender === "admin");
  if (first && !g.__sgWelcome.has(userId)) {
    g.__sgWelcome.add(userId);
    botSay(userId, WELCOME_MSG, { welcomeOnly: true });
    return;
  }

  if (!AUTO_REPLY || (await adminOnline())) return;
  if (last.type !== "text") return;
  const text = String(last.message || "");
  if (!text || text.startsWith("sticker:")) return;
  let reply = null;
  for (const [re, r] of BOT_REPLIES) if (re.test(text)) { reply = r; break; }
  if (!reply) reply = BOT_FALLBACK[botIdx++ % BOT_FALLBACK.length];
  botSay(userId, reply);
}

/* ---------------- push ---------------- */

let webpush = null;
try {
  webpush = (await import("web-push")).default;
} catch {}

async function vapidKeys() {
  if (remoteOn) {
    let raw = await kv.get("vapid");
    if (raw) return JSON.parse(raw);
    const keys = webpush.generateVAPIDKeys();
    await kv.set("vapid", JSON.stringify(keys));
    return keys;
  }
  const keyFile = path.join(DATA_DIR, "vapid.json");
  let keys = null;
  try { keys = JSON.parse(fs.readFileSync(keyFile, "utf8")); } catch {}
  if (!keys?.publicKey) {
    keys = webpush.generateVAPIDKeys();
    try { fs.writeFileSync(keyFile, JSON.stringify(keys)); } catch {}
  }
  return keys;
}

if (webpush) {
  try {
    const keys = await vapidKeys();
    webpush.setVapidDetails("mailto:support@billy777.com", keys.publicKey, keys.privateKey);
    g.__sgVapid = keys.publicKey;
  } catch { g.__sgVapid = null; }
}

export function vapidKey() { return g.__sgVapid; }

export async function addSub(userId, sub) {
  if (remoteOn) return remote.addSub(userId, sub);
  if (!db.subs[userId]) db.subs[userId] = [];
  if (!db.subs[userId].some((s) => s.endpoint === sub.endpoint)) {
    db.subs[userId].push(sub);
    save();
  }
}

export async function removeSub(userId, endpoint) {
  if (remoteOn) return remote.removeSub(userId, endpoint);
  db.subs[userId] = (db.subs[userId] || []).filter((s) => s.endpoint !== endpoint);
  save();
}

export async function pushToUser(userId, payload) {
  if (!webpush) return;
  const subs = remoteOn ? await remote.subsOf(userId) : db.subs[userId] || [];
  for (const sub of subs) {
    webpush
      .sendNotification(sub, JSON.stringify({ icon: "/app/icon-192.png?v=3", url: "/chat", ...payload }))
      .catch(() => {});
  }
}

/* admin push subs — main admin (agent_id null) hears all; agents only their users */
export async function addAdminSub(admin, sub) {
  const agentId = admin?.main ? null : admin?.agent?.id ?? null;
  if (remoteOn) return remote.addAdminSub(agentId, sub);
  if (!db.adminSubs) db.adminSubs = [];
  if (!db.adminSubs.some((s) => s.endpoint === sub.endpoint)) {
    db.adminSubs.push({ endpoint: sub.endpoint, agent_id: agentId, json: sub });
    save();
  }
}

export async function removeAdminSub(endpoint) {
  if (remoteOn) return remote.removeAdminSub(endpoint);
  db.adminSubs = (db.adminSubs || []).filter((s) => s.endpoint !== endpoint);
  save();
}

export async function pushToAdmins(user, payload) {
  if (!webpush) return;
  const agentId = user?.agent_id ?? null;
  const subs = remoteOn
    ? await remote.adminSubsFor(agentId)
    : (db.adminSubs || []).filter((s) => s.agent_id == null || (agentId != null && s.agent_id === agentId));
  for (const s of subs) {
    webpush
      .sendNotification(s.json || s, JSON.stringify({ icon: "/app/icon-192.png?v=3", url: "/admin", ...payload }))
      .catch(() => {});
  }
}

/* ---------------- misc ---------------- */

export function json(data, init = {}) {
  return Response.json(data, init);
}

export function sseStream(onOpen, onClose, signal) {
  const enc = new TextEncoder();
  let closed = false;
  let hb = null;
  let cleanupFn = () => {};
  const shutdown = () => {
    if (closed) return;
    closed = true;
    if (hb) clearInterval(hb);
    try { cleanupFn(); } catch {}
  };
  const stream = new ReadableStream({
    start(controller) {
      if (signal) {
        if (signal.aborted) return shutdown();
        signal.addEventListener("abort", shutdown, { once: true });
      }
      const write = (chunk) => {
        if (closed) return;
        try { controller.enqueue(enc.encode(chunk)); } catch { shutdown(); }
      };
      hb = setInterval(() => {
        if (closed) return clearInterval(hb);
        write(`:hb ${Date.now()}\n\n`);
      }, 15000);
      Promise.resolve(onOpen(write)).then((f) => {
        cleanupFn = f || (() => {});
        if (closed) { try { cleanupFn(); } catch {} }
      });
    },
    cancel() {
      shutdown();
      onClose?.();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
