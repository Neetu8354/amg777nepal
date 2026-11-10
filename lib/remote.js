/* Supabase layer — the source of truth when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
   are set (required on serverless). Without them the app runs on the local JSON store. */

import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const remoteOn = !!(url && key);
export const sb = remoteOn
  ? createClient(url, key, { auth: { persistSession: false } })
  : null;

function run(p, label) {
  p.then(({ error }) => { if (error) console.error(`[supabase] ${label}:`, error.message); })
   .catch((e) => console.error(`[supabase] ${label}:`, e?.message || e));
}

/* ---------------- ids ---------------- */
// shared sequence so concurrent serverless instances never collide
export async function nextId() {
  const { data, error } = await sb.rpc("sg_next_id");
  if (error || data == null) {
    // fallback: time-based (still unique across instances)
    return Date.now() * 1000 + crypto.randomInt(1000);
  }
  return Number(data);
}

/* ---------------- kv ---------------- */
const kvCache = new Map();
export const kv = {
  async get(k) {
    if (kvCache.has(k)) return kvCache.get(k);
    const { data } = await sb.from("sg_kv").select("value").eq("key", k).maybeSingle();
    if (data) kvCache.set(k, data.value);
    return data?.value ?? null;
  },
  async set(k, value) {
    kvCache.set(k, value);
    run(sb.from("sg_kv").upsert({ key: k, value }), "kv.set");
  },
};

/* ---------------- users / sessions ---------------- */
export const remote = {
  async userByMobile(mobile) {
    const { data } = await sb.from("sg_users").select("*").eq("mobile", mobile).maybeSingle();
    return data || null;
  },
  async userById(id) {
    const { data } = await sb.from("sg_users").select("*").eq("id", id).maybeSingle();
    return data || null;
  },
  async usersAll() {
    const { data } = await sb.from("sg_users").select("*");
    return data || [];
  },
  upsertUser(u) {
    const { online, ...row } = u;
    run(sb.from("sg_users").upsert(row), "upsertUser");
  },
  patchUser(id, patch) {
    return sb.from("sg_users").update(patch).eq("id", id).then(({ error }) => {
      if (error) console.error("[supabase] patchUser:", error.message);
    });
  },
  async insertUser(u) {
    const { online, ...row } = u;
    const { data, error } = await sb.from("sg_users").insert(row).select().single();
    if (error) console.error("[supabase] insertUser:", error.message);
    return data;
  },
  async sessionUser(token) {
    const { data } = await sb
      .from("sg_sessions").select("user_id, sg_users(*)")
      .eq("token", token).maybeSingle();
    return data?.sg_users || null;
  },
  upsertSession(token, userId) {
    return sb.from("sg_sessions").upsert({ token, user_id: userId }).then(({ error }) => {
      if (error) console.error("[supabase] upsertSession:", error.message);
    });
  },
  deleteSession(token) {
    return sb.from("sg_sessions").delete().eq("token", token).then(({ error }) => {
      if (error) console.error("[supabase] deleteSession:", error.message);
    });
  },
  async adminSessionOk(token) {
    const { data } = await sb.from("sg_admin_sessions").select("token").eq("token", token).maybeSingle();
    return !!data;
  },
  async adminSessionAgent(token) {
    const { data } = await sb.from("sg_admin_sessions").select("agent_id").eq("token", token).maybeSingle();
    return data ? data.agent_id : undefined;
  },
  upsertAdminSession(token, agentId) {
    return sb.from("sg_admin_sessions").upsert({ token, at: new Date().toISOString(), agent_id: agentId ?? null }).then(({ error }) => {
      if (error) console.error("[supabase] upsertAdminSession:", error.message);
    });
  },
  async agentsAll() {
    const { data } = await sb.from("sg_agents").select("*");
    return data || [];
  },
  async insertAgent(a) {
    const { error } = await sb.from("sg_agents").insert(a);
    if (error) console.error("[supabase] insertAgent:", error.message);
  },
  patchAgent(id, patch) {
    run(sb.from("sg_agents").update(patch).eq("id", id), "patchAgent");
  },
  deleteAgent(id) {
    run(sb.from("sg_agents").delete().eq("id", id), "deleteAgent");
  },
  deleteAdminSession(token) {
    return sb.from("sg_admin_sessions").delete().eq("token", token).then(({ error }) => {
      if (error) console.error("[supabase] deleteAdminSession:", error.message);
    });
  },

  /* ---------------- messages ---------------- */
  async messagesOf(userId) {
    const { data } = await sb.from("sg_messages").select("*").eq("user_id", userId).order("id");
    return data || [];
  },
  async allMessages() {
    const { data } = await sb.from("sg_messages").select("*").order("id");
    return data || [];
  },
  async insertMessage(userId, m) {
    const { data, error } = await sb
      .from("sg_messages").insert({ ...m, user_id: userId }).select().single();
    if (error) console.error("[supabase] insertMessage:", error.message);
    return data || m;
  },
  async patchMessage(userId, id, patch) {
    const { data, error } = await sb
      .from("sg_messages").update(patch).eq("id", id).eq("user_id", userId).select().maybeSingle();
    if (error) console.error("[supabase] patchMessage:", error.message);
    return data || null;
  },
  async deleteMessage(userId, id) {
    const { data } = await sb
      .from("sg_messages").delete().eq("id", id).eq("user_id", userId).select().maybeSingle();
    return data || null;
  },

  /* ---------------- push subs ---------------- */
  async subsOf(userId) {
    const { data } = await sb.from("sg_subs").select("json").eq("user_id", userId);
    return (data || []).map((r) => r.json);
  },
  async addSub(userId, sub) {
    run(
      sb.from("sg_subs").upsert({ user_id: userId, endpoint: sub.endpoint, json: sub }),
      "addSub"
    );
  },
  removeSub(userId, endpoint) {
    run(sb.from("sg_subs").delete().eq("user_id", userId).eq("endpoint", endpoint), "removeSub");
  },
  replaceSubs(userId, subs) {
    run(
      sb.from("sg_subs").delete().eq("user_id", userId).then(async (r) => {
        if (r.error || !subs.length) return r;
        return sb.from("sg_subs").insert(subs.map((s) => ({ user_id: userId, endpoint: s.endpoint, json: s })));
      }),
      "replaceSubs"
    );
  },
  /* ---------------- admin push subs (sg_admin_subs) ---------------- */
  /* main-admin subs (agent_id null) get every call; agent subs only their users' */
  async adminSubsFor(agentId) {
    const { data } = await sb.from("sg_admin_subs").select("json, agent_id");
    return (data || []).filter((r) => r.agent_id == null || (agentId != null && r.agent_id === agentId));
  },
  addAdminSub(agentId, sub) {
    run(
      sb.from("sg_admin_subs").upsert({ endpoint: sub.endpoint, agent_id: agentId ?? null, json: sub }),
      "addAdminSub"
    );
  },
  removeAdminSub(endpoint) {
    run(sb.from("sg_admin_subs").delete().eq("endpoint", endpoint), "removeAdminSub");
  },

  insertVisit(v) {
    run(sb.from("sg_visits").insert({ payload: v }), "insertVisit");
  },

  /* ---------------- presence (sg_presence rows, ~45s TTL) ---------------- */
  async presenceJoin(key, kind, userId) {
    run(sb.from("sg_presence").upsert({ key, kind, user_id: userId, at: new Date().toISOString() }), "presenceJoin");
  },
  presenceBeat(key) {
    run(sb.from("sg_presence").update({ at: new Date().toISOString() }).eq("key", key), "presenceBeat");
  },
  presenceLeave(key) {
    run(sb.from("sg_presence").delete().eq("key", key), "presenceLeave");
  },
  _pCache: new Map(),
  async presenceCount(kind, userId) {
    const ck = kind + ":" + (userId ?? "");
    const c = this._pCache.get(ck);
    if (c && c.exp > Date.now()) return c.v;
    const since = new Date(Date.now() - 45000).toISOString();
    let q = sb.from("sg_presence").select("key", { count: "exact", head: true }).eq("kind", kind).gte("at", since);
    if (userId != null) q = q.eq("user_id", userId);
    const { count } = await q;
    this._pCache.set(ck, { v: count || 0, exp: Date.now() + 4000 });
    return count || 0;
  },
  _pIdsCache: null,
  async presenceOnlineIds(kind) {
    if (this._pIdsCache && this._pIdsCache.exp > Date.now()) return this._pIdsCache.v;
    const since = new Date(Date.now() - 45000).toISOString();
    const { data } = await sb.from("sg_presence").select("user_id").eq("kind", kind).gte("at", since);
    const v = new Set((data || []).map((r) => r.user_id));
    this._pIdsCache = { v, exp: Date.now() + 4000 };
    return v;
  },
  async adminLastSeen() {
    const { data } = await sb
      .from("sg_presence").select("at").eq("kind", "admin").order("at", { ascending: false }).limit(1).maybeSingle();
    return data?.at || null;
  },

  /* ---------------- calls (sg_calls) ---------------- */
  async callGet(id) {
    const { data } = await sb.from("sg_calls").select("*").eq("id", id).maybeSingle();
    return data || null;
  },
  async callOpen(userId) {
    const { data } = await sb
      .from("sg_calls").select("*").eq("user_id", userId)
      .in("status", ["ringing", "connecting", "connected"]).maybeSingle();
    return data || null;
  },
  async callStale() {
    // ringing > 30s or connecting > 25s
    const rOut = Date.now() - 30000, cOut = Date.now() - 25000;
    const { data } = await sb.from("sg_calls").select("*").or(
      `and(status.eq.ringing,created_ms.lt.${rOut}),and(status.eq.connecting,created_ms.lt.${cOut}),and(status.eq.connected,created_ms.lt.${Date.now()-10800000})`
    );
    return data || [];
  },
  callUpsert(c) {
    run(sb.from("sg_calls").upsert(c), "callUpsert");
  },
  callDelete(id) {
    run(sb.from("sg_calls").delete().eq("id", id), "callDelete");
  },

  /* ---------------- storage (sg-media bucket) ---------------- */
  _bucketReady: null,
  async ensureBucket() {
    if (this._bucketReady) return this._bucketReady;
    this._bucketReady = (async () => {
      const { error } = await sb.storage.createBucket("sg-media", { public: true });
      if (error && !/already exists|Duplicate/i.test(error.message)) {
        console.error("[supabase] createBucket:", error.message);
      }
      return true;
    })();
    return this._bucketReady;
  },
  async upload(name, buf, contentType) {
    await this.ensureBucket();
    const { error } = await sb.storage
      .from("sg-media").upload(name, buf, { contentType, upsert: true });
    if (error) { console.error("[supabase] upload:", error.message); return null; }
    const { data } = sb.storage.from("sg-media").getPublicUrl(name);
    return data?.publicUrl || null;
  },

  /* ---------------- authx ephemeral state ---------------- */
  otpSet(mobile, code, expMs) {
    return sb.from("sg_otps").upsert({ mobile, code, exp_ms: expMs }).then(({ error }) => {
      if (error) console.error("[supabase] otpSet:", error.message);
    });
  },
  async otpGet(mobile) {
    const { data } = await sb.from("sg_otps").select("*").eq("mobile", mobile).maybeSingle();
    return data || null;
  },
  otpDel(mobile) {
    run(sb.from("sg_otps").delete().eq("mobile", mobile), "otpDel");
  },
  waSet(state, rec) {
    return sb.from("sg_wa").upsert({ state, mobile: rec.mobile, code: rec.code, approve_ms: rec.approveAt, done: rec.done }).then(({ error }) => {
      if (error) console.error("[supabase] waSet:", error.message);
    });
  },
  async waGet(state) {
    const { data } = await sb.from("sg_wa").select("*").eq("state", state).maybeSingle();
    if (!data) return null;
    return { mobile: data.mobile, code: data.code, approveAt: data.approve_ms, done: data.done };
  },
  waDel(state) {
    run(sb.from("sg_wa").delete().eq("state", state), "waDel");
  },
};
