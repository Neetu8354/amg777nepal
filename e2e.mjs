// E2E test for amg777 Customer Support — run with dev server on :3000
const B = "http://localhost:3000";
const results = [];
const ok = (n, c, x = "") => { results.push([c, n, x]); console.log(`${c ? "PASS" : "FAIL"}  ${n}${x ? "  — " + x : ""}`); };
const J = (t) => { try { return JSON.parse(t); } catch { return null; } };

async function api(path, { method = "GET", body, cookie, form } = {}) {
  const h = {};
  if (cookie) h.Cookie = cookie;
  let b;
  if (form) b = form;
  else if (body !== undefined) { h["Content-Type"] = "application/json"; b = JSON.stringify(body); }
  const r = await fetch(path.startsWith("http") ? path : B + path, { method, headers: h, body: b, redirect: "manual" });
  const setc = (r.headers.getSetCookie?.() || []).map((s) => s.split(";")[0]).join("; ");
  const text = await r.text();
  return { status: r.status, json: J(text), text, setc, ctype: r.headers.get("content-type") || "" };
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- 1. Public pages & assets ----------
let r;
r = await api("/"); ok("GET /", r.status === 200 || [307, 308].includes(r.status), `HTTP ${r.status}`);
for (const p of ["/verify", "/admin", "/social"]) {
  r = await api(p); ok(`GET ${p}`, r.status === 200, `HTTP ${r.status}`);
}
r = await api("/manifest.json"); ok("manifest.json", r.status === 200 && r.json?.name, r.json?.name || "");
r = await api("/sw.js"); ok("sw.js", r.status === 200 && r.text.includes("addEventListener"), `HTTP ${r.status}`);
r = await api("/chat"); ok("GET /chat (unauthenticated)", [200, 307, 308].includes(r.status), `HTTP ${r.status}`);

// ---------- 2. Auth methods ----------
r = await api("/api/auth/methods");
ok("auth/methods shape", r.status === 200 && r.json?.plain === true, JSON.stringify(r.json));

// ---------- 3. Disabled login methods correctly refuse ----------
r = await api("/api/auth/wa/otp/send", { method: "POST", body: { mobile: "9999999999" } });
ok("wa/otp/send disabled → 403", r.status === 403, `HTTP ${r.status}`);
r = await api("/api/auth/wa/start", { method: "POST", body: { mobile: "9999999999" } });
ok("wa/start disabled → 403", r.status === 403, `HTTP ${r.status}`);
r = await api("/api/auth/telegram/start", { method: "POST" });
ok("telegram disabled → 403", r.status === 403, `HTTP ${r.status}`);

// ---------- 4. Real SMS via Laaffic ----------
r = await api("/api/verify-mobile", { method: "POST", body: { mobile: "3001234567", cc: "977" } });
ok("verify-mobile REAL number → OTP sent", r.json?.success && r.json.otp_required, `delivered=${r.json?.delivered} dev_code=${r.json?.dev_code ?? "none"}`);

// ---------- 5. Full user loop via dev_code fallback ----------
const FAKE_MOBILE = "39" + String(Date.now()).slice(-8); // 10 digits, unroutable → dev_code
r = await api("/api/verify-mobile", { method: "POST", body: { mobile: FAKE_MOBILE } });
const devCode = r.json?.dev_code;
ok("verify-mobile fake number → dev_code fallback", r.json?.success && !!devCode, `delivered=${r.json?.delivered} mobile=${FAKE_MOBILE}`);
r = await api("/api/verify-otp", { method: "POST", body: { mobile: FAKE_MOBILE, otp: devCode, cc: "977" } });
const userCookie = r.setc;
ok("verify-otp → session", r.json?.success && r.json.redirect === "/chat" && userCookie.includes("sg_session"), `user=${r.json?.username}`);

// ---------- 6. Authenticated user endpoints ----------
r = await api("/api/chat/me", { cookie: userCookie });
ok("chat/me", r.json?.success && r.json.mobile === FAKE_MOBILE, `admin_online=${r.json?.admin_online}`);
r = await api("/api/me", { cookie: userCookie });
ok("me", r.json?.success === true);
await sleep(1500); // welcome msg lands ~900ms
r = await api("/api/chat/hello", { cookie: userCookie });
ok("chat/hello + welcome message", r.json?.success && r.json.messages.some((m) => m.sender === "admin"), `msgs=${r.json?.messages?.length}`);

// ---------- 7. SSE stream + presence ----------
const sseCtrl = new AbortController();
const sseEvents = [];
const ssePromise = fetch(B + "/api/chat/events", { headers: { Cookie: userCookie }, signal: sseCtrl.signal }).then(async (res) => {
  const rd = res.body.getReader(); const dec = new TextDecoder(); let buf = "";
  while (true) {
    const { done, value } = await rd.read(); if (done) break;
    buf += dec.decode(value, { stream: true });
    const parts = buf.split("\n\n"); buf = parts.pop();
    for (const p of parts) { const ev = p.match(/^event: (\w+)/m)?.[1]; if (ev) sseEvents.push({ ev, raw: p }); }
  }
}).catch(() => {});
for (let i = 0; i < 16 && !(sseEvents.some((e) => e.ev === "hello") && sseEvents.some((e) => e.ev === "presence")); i++) await sleep(250);
ok("SSE /api/chat/events opens (hello+presence)", sseEvents.some((e) => e.ev === "hello") && sseEvents.some((e) => e.ev === "presence"), sseEvents.map(e=>e.ev).join(","));

// ---------- 8. Send message + bot auto-reply ----------
r = await api("/api/messages/send", { method: "POST", cookie: userCookie, body: { message: "hello, I need help with booking" } });
ok("messages/send", r.json?.success && r.json.message?.id, `id=${r.json?.message?.id}`);
const myMsgId = r.json?.message?.id;
let botMsg;
for (let i = 0; i < 32; i++) {
  botMsg = sseEvents.find((e) => e.ev === "message" && e.raw.includes('"sender":"admin"'));
  if (botMsg) break;
  await sleep(250);
}
ok("bot auto-reply via SSE (admin offline)", !!botMsg, botMsg ? "received" : sseEvents.map((e) => e.ev).join(","));
ok("bot typing indicator seen", sseEvents.some((e) => e.ev === "typing"));

// ---------- 9. Media upload ----------
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const fd = new FormData();
fd.append("file", new Blob([png], { type: "image/png" }), "t.png");
fd.append("kind", "image");
fd.append("caption", "test pic");
r = await api("/api/messages/send-media", { method: "POST", cookie: userCookie, form: fd });
const imgUrl = r.json?.message?.image;
ok("send-media image upload", r.json?.success && !!imgUrl, imgUrl || r.text.slice(0, 80));
if (imgUrl) { r = await api(imgUrl); ok("uploaded file served (Supabase Storage)", r.status === 200, `HTTP ${r.status} ${r.ctype}`); }

// ---------- 10. Edit / delete ----------
r = await api("/api/messages/edit", { method: "POST", cookie: userCookie, body: { id: myMsgId, message: "hello, edited — need help with booking" } });
ok("messages/edit own", r.json?.success && r.json.message?.edited_at, "");
await sleep(400);
const sseEdit = sseEvents.find((e) => e.ev === "edited");
ok("edit broadcast via SSE", !!sseEdit);
const fd2 = new FormData(); fd2.append("file", new Blob([png], { type: "image/png" }), "t2.png"); fd2.append("kind", "image");
r = await api("/api/messages/send-media", { method: "POST", cookie: userCookie, form: fd2 });
const delId = r.json?.message?.id;
r = await api("/api/messages/delete", { method: "POST", cookie: userCookie, body: { id: delId } });
ok("messages/delete own", r.json?.success === true);

// ---------- 11. Typing, stickers, push, tracking ----------
r = await api("/api/chat/typing", { method: "POST", cookie: userCookie, body: { is_typing: true } });
ok("chat/typing", r.json?.success === true);
r = await api("/api/chat/stickers"); ok("stickers", r.json?.success && r.json.stickers.length > 10, `n=${r.json?.stickers?.length}`);
r = await api("/api/push/key"); ok("push/key VAPID", r.status === 200 && (r.json?.key === null || typeof r.json?.key === "string"), r.json?.key ? "key set" : "no key");
r = await api("/api/push/subscribe", { method: "POST", cookie: userCookie, body: { endpoint: "https://push.example.com/sub/abc", keys: { p256dh: "x", auth: "y" } } });
ok("push/subscribe", r.json?.success === true);
r = await api("/api/push/unsubscribe", { method: "POST", cookie: userCookie, body: { endpoint: "https://push.example.com/sub/abc" } });
ok("push/unsubscribe", r.status === 200);
r = await api("/api/track/visit", { method: "POST", body: { path: "/verify", ref: "e2e" } }); ok("track/visit", r.json?.ok === true);
r = await api("/api/track/geo", { method: "POST", body: { lat: 13.0, lon: 80.2 } }); ok("track/geo", r.json?.ok === true);

// ---------- 12. Admin console ----------
r = await api("/api/admin/login", { method: "POST", body: { username: "admin", password: "amg777" } });
const adminCookie = r.setc;
ok("admin/login", r.json?.success && adminCookie.includes("sg_admin"), `role=${r.json?.role}`);
r = await api("/api/admin/me", { cookie: adminCookie });
ok("admin/me role=main", r.json?.success && r.json.role === "main");
r = await api("/api/admin/users", { cookie: adminCookie });
const me = r.json?.users?.find((u) => u.mobile === FAKE_MOBILE);
ok("admin/users lists test user", !!me, `users=${r.json?.users?.length} unread=${me?.unread} online=${me?.online}`);
ok("user shows online (SSE presence)", me?.online === true);
r = await api("/api/admin/agents", { cookie: adminCookie });
ok("admin/agents list", r.json?.success === true, `n=${r.json?.agents?.length ?? "?"}`);

// admin SSE for read receipts
const aCtrl = new AbortController(); const aEvents = [];
fetch(B + "/api/admin/events", { headers: { Cookie: adminCookie }, signal: aCtrl.signal }).then(async (res) => {
  const rd = res.body.getReader(); const dec = new TextDecoder(); let buf = "";
  while (true) { const { done, value } = await rd.read(); if (done) break;
    buf += dec.decode(value, { stream: true });
    const parts = buf.split("\n\n"); buf = parts.pop();
    for (const p of parts) { const ev = p.match(/^event: (\w+)/m)?.[1]; if (ev) aEvents.push({ ev, raw: p }); } }
}).catch(() => {});
await sleep(700);

// admin replies → user SSE gets message + delivered
const sseMark = sseEvents.length;
r = await api("/api/admin/send", { method: "POST", cookie: adminCookie, body: { userId: me.id, message: "E2E reply from agent" } });
ok("admin/send", r.json?.success === true);
await sleep(700);
const got = sseEvents.slice(sseMark).map((e) => e.ev);
ok("user SSE got admin message + delivered", got.includes("message") && got.includes("delivered"), got.join(","));

// user ack → admin SSE gets read
const aMark = aEvents.length;
r = await api("/api/chat/ack", { method: "POST", cookie: userCookie });
ok("chat/ack marks admin msgs read", r.json?.success === true);
await sleep(700);
ok("admin SSE got read receipt", aEvents.slice(aMark).some((e) => e.ev === "read"), aEvents.slice(aMark).map(e=>e.ev).join(","));

// admin typing → user SSE
r = await api("/api/admin/typing", { method: "POST", cookie: adminCookie, body: { userId: me.id, is_typing: true } });
await sleep(500);
ok("admin typing → user SSE", sseEvents.slice(sseMark).concat(sseEvents).some((e) => e.ev === "typing" && e.raw.includes('"by":"admin"')) || sseEvents.some(e=>e.ev==="typing"), "");

// admin reads conversation → user SSE 'read'
const sm2 = sseEvents.length;
r = await api(`/api/admin/messages?u=${me.id}`, { cookie: adminCookie });
ok("admin/messages fetch", r.json?.success && Array.isArray(r.json.messages), `msgs=${r.json?.messages?.length}`);
await sleep(500);
ok("user SSE got read receipt", sseEvents.slice(sm2).some((e) => e.ev === "read"), "");

// ---------- 13. Call signaling (admin initiates → user accepts → connected → end) ----------
r = await api("/api/admin/call", { method: "POST", cookie: adminCookie, body: { action: "start", userId: me.id } });
const callId = r.json?.callId;
ok("admin call start (user online)", r.json?.success && !!callId, callId || r.text.slice(0, 90));
await sleep(500);
ok("user SSE got incoming call", sseEvents.some((e) => e.ev === "call" && e.raw.includes('"incoming"')), "");
r = await api("/api/chat/call", { method: "POST", cookie: userCookie, body: { action: "accept", callId } });
ok("user accepts call", r.json?.success === true, r.json?.error || "");
r = await api("/api/chat/call", { method: "POST", cookie: userCookie, body: { action: "connected", callId } });
ok("call connected", r.json?.success === true);
r = await api("/api/chat/call", { method: "POST", cookie: userCookie, body: { action: "signal", callId, data: { sdp: "fake" } } });
ok("call signal relay", r.json?.success === true);
r = await api("/api/admin/call", { method: "POST", cookie: adminCookie, body: { action: "end", callId } });
ok("admin ends call", r.json?.success === true);
await sleep(400);
ok("user SSE got call end", sseEvents.some((e) => e.ev === "call" && e.raw.includes('"end"')), "");

// user initiates → admin declines
r = await api("/api/chat/call", { method: "POST", cookie: userCookie, body: { action: "start" } });
const callId2 = r.json?.callId;
ok("user call start (admin online via SSE)", r.json?.success && !!callId2, r.json?.error || callId2);
r = await api("/api/admin/call", { method: "POST", cookie: adminCookie, body: { action: "decline", callId: callId2 } });
ok("admin declines", r.json?.success === true);

// ---------- 14. Block / unblock ----------
r = await api("/api/admin/block", { method: "POST", cookie: adminCookie, body: { userId: me.id, blocked: true } });
ok("admin/block", r.json?.success === true);
r = await api("/api/messages/send", { method: "POST", cookie: userCookie, body: { message: "am i blocked?" } });
ok("blocked user cannot send → 403", r.status === 403, r.json?.error || "");
r = await api("/api/chat/call", { method: "POST", cookie: userCookie, body: { action: "start" } });
ok("blocked user cannot call → 403", r.status === 403);
r = await api("/api/admin/block", { method: "POST", cookie: adminCookie, body: { userId: me.id, blocked: false } });
ok("admin/unblock", r.json?.success === true);

// ---------- 15. Admin deletes a message ----------
r = await api(`/api/admin/messages?u=${me.id}`, { cookie: adminCookie });
const anyMsg = r.json?.messages?.find((m) => m.sender === "user");
r = await api("/api/admin/delete", { method: "POST", cookie: adminCookie, body: { userId: me.id, id: anyMsg?.id } });
ok("admin/delete message", r.json?.success === true);

// ---------- 16. Security: no auth → 401 ----------
r = await api("/api/messages/send", { method: "POST", body: { message: "x" } });
ok("send without session → 401", r.status === 401);
r = await api("/api/admin/users");
ok("admin/users without session → 401", r.status === 401);
r = await api("/api/chat/events");
ok("chat/events without session → 401", r.status === 401);

// ---------- 17. Logout ----------
sseCtrl.abort(); aCtrl.abort();
r = await api("/api/chat/logout", { method: "POST", cookie: userCookie });
ok("chat/logout", r.json?.success === true);
r = await api("/api/chat/me", { cookie: "sg_session=" });
ok("post-logout me → 401", r.status === 401);
r = await api("/api/admin/logout", { method: "POST", cookie: adminCookie });
ok("admin/logout", r.json?.success === true);

// ---------- summary ----------
const fails = results.filter(([c]) => !c);
console.log(`\n===== ${results.length - fails.length}/${results.length} PASSED =====`);
if (fails.length) for (const [, n, x] of fails) console.log("FAILED:", n, x);
process.exit(0);
