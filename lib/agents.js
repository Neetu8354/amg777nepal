/* Multi-agent support. Main admin (env creds) creates agents; each agent gets
   username/password + country prefixes. Users are routed to an agent by their
   country code at signup. Dual-mode: sg_agents on Supabase, db.json locally. */

import crypto from "crypto";
import { db, save } from "@/lib/db";
import { remote, remoteOn, nextId } from "@/lib/remote";

if (!db.agents) db.agents = {};

function hash(pass, salt) {
  return crypto.createHash("sha256").update(`${salt}:${pass}`).digest("hex");
}

/* ---------------- cache ---------------- */
let agentsCache = null;
let agentsCacheExp = 0;
async function allAgents(force) {
  if (!force && agentsCache && agentsCacheExp > Date.now()) return agentsCache;
  agentsCache = remoteOn
    ? (await remote.agentsAll()) || []
    : Object.values(db.agents);
  agentsCacheExp = Date.now() + 15000;
  return agentsCache;
}
function bustCache() { agentsCache = null; }

export async function listAgents() {
  return (await allAgents()).map((a) => ({
    id: a.id, username: a.username, name: a.name,
    prefixes: a.prefixes || [], is_default: !!a.is_default,
    active: !!a.active, created_at: a.created_at,
  }));
}

export async function createAgent({ username, password, name, prefixes, is_default }) {
  username = String(username || "").trim().toLowerCase();
  if (!username || !password || !name) return { error: "username, password and name required" };
  const salt = crypto.randomBytes(8).toString("hex");
  const agent = {
    id: remoteOn ? await nextId() : (db.seq++),
    username,
    pass_hash: `${salt}:${hash(password, salt)}`,
    name: String(name).trim(),
    prefixes: (Array.isArray(prefixes) ? prefixes : String(prefixes || "").split(/[\s,]+/))
      .map((p) => String(p).replace(/\D/g, "")).filter(Boolean),
    is_default: !!is_default,
    active: true,
    created_at: new Date().toISOString(),
  };
  if (remoteOn) await remote.insertAgent(agent);
  else { db.agents[agent.id] = agent; save(); }
  bustCache();
  const { pass_hash, ...safe } = agent;
  return safe;
}

export async function updateAgent(id, patch) {
  const clean = {};
  if (patch.name != null) clean.name = String(patch.name);
  if (patch.prefixes != null) clean.prefixes = (Array.isArray(patch.prefixes) ? patch.prefixes : String(patch.prefixes).split(/[\s,]+/)).map((p) => String(p).replace(/\D/g, "")).filter(Boolean);
  if (patch.active != null) clean.active = !!patch.active;
  if (patch.is_default != null) clean.is_default = !!patch.is_default;
  if (patch.password) {
    const salt = crypto.randomBytes(8).toString("hex");
    clean.pass_hash = `${salt}:${hash(patch.password, salt)}`;
  }
  if (remoteOn) await remote.patchAgent(id, clean);
  else { Object.assign(db.agents[id] || {}, clean); save(); }
  bustCache();
  return { ok: true };
}

export async function deleteAgent(id) {
  if (remoteOn) await remote.deleteAgent(id);
  else { delete db.agents[id]; save(); }
  bustCache();
  return { ok: true };
}

export async function agentLogin(username, password) {
  const a = (await allAgents(true)).find(
    (x) => x.username === String(username || "").trim().toLowerCase() && x.active
  );
  if (!a) return null;
  const [salt, h] = String(a.pass_hash || "").split(":");
  if (hash(password, salt) !== h) return null;
  const { pass_hash, ...safe } = a;
  return safe;
}

/* ---------------- routing: country code -> agent ---------------- */
export async function agentForCc(cc) {
  cc = String(cc || "91").replace(/\D/g, "");
  const agents = (await allAgents()).filter((a) => a.active);
  // longest prefix match wins (e.g. "977" before "9")
  let best = null, bestLen = -1;
  for (const a of agents) {
    for (const p of a.prefixes || []) {
      if (cc.startsWith(p) && p.length > bestLen) { best = a; bestLen = p.length; }
    }
  }
  if (!best) best = agents.find((a) => a.is_default) || null;
  return best;
}

/* channel for a user's assigned agent group (falls back to shared admin ch) */
export function agentCh(agentId) {
  return agentId ? `a:${agentId}` : "admin";
}
export function adminChFor(user) {
  return agentCh(user?.agent_id);
}
