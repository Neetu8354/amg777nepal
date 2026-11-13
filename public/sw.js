const CACHE = "img-year-v2";
const STATIC_CACHE = "app-static";
const STATIC_MAX = 250;
const MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;
const SKIP = [/\/uploads\/screens\//i, /\/api\//i];
const IS_DEV_HOST = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(self.location.hostname);

function shouldHandle(request) {
  if (request.method !== "GET") return false;
  let url;
  try { url = new URL(request.url); } catch { return false; }
  if (SKIP.some((re) => re.test(url.pathname))) return false;
  if (url.pathname.startsWith("/_next/") && !url.pathname.startsWith("/_next/static/media")) return false;
  if (request.destination === "image") return true;
  return /\.(jpe?g|png|gif|webp|avif|svg|ico|bmp)(\?|$)/i.test(url.pathname);
}

function isStaticAsset(request) {
  if (request.method !== "GET" || IS_DEV_HOST) return false;
  try {
    const url = new URL(request.url);
    return url.origin === self.location.origin && url.pathname.startsWith("/_next/static/");
  } catch { return false; }
}

async function trimCache(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

const OFFLINE_HTML = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline</title>
<style>body{margin:0;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#050505;color:#eee;font-family:system-ui,'Segoe UI',sans-serif;gap:12px}
h1{font-size:20px;margin:0}p{color:#999;font-size:14px;margin:0 0 8px}
button{background:#25d366;color:#fff;border:0;border-radius:22px;padding:12px 28px;font-weight:700;font-size:15px;cursor:pointer}</style></head>
<body><h1>No internet connection</h1><p>Internet on karein, app apne aap khul jayega.</p><button onclick="location.reload()">Retry</button></body></html>`;

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(["/app/icon-192.png?v=3"]).catch(() => {});
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith("img-year-") && k !== CACHE).map((k) => caches.delete(k)));
    if (IS_DEV_HOST) await caches.delete(STATIC_CACHE);
    if (self.registration.navigationPreload) await self.registration.navigationPreload.enable().catch(() => {});
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  // file downloads must hit the network directly — a SW-served download loses its filename (saves as a GUID)
  try {
    if (/\.apk$/i.test(new URL(req.url).pathname)) return;
  } catch {}
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const pre = await event.preloadResponse;
        if (pre) return pre;
        return await fetch(req);
      } catch {
        return new Response(OFFLINE_HTML, { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } });
      }
    })());
    return;
  }
  if (isStaticAsset(req)) {
    event.respondWith((async () => {
      const cache = await caches.open(STATIC_CACHE);
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone()).then(() => trimCache(STATIC_CACHE, STATIC_MAX)).catch(() => {});
      return res;
    })());
    return;
  }
  if (!shouldHandle(req)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req, { ignoreSearch: false });
    if (hit) {
      const storedAt = Number(hit.headers.get("x-cached-at") || 0);
      if (!storedAt || Date.now() - storedAt < MAX_AGE_MS) return hit;
    }
    const res = await fetch(req);
    if (!res.ok && res.type !== "opaque") return res;
    try {
      if (res.type === "opaque") {
        await cache.put(req, res.clone());
      } else {
        const headers = new Headers(res.headers);
        headers.set("x-cached-at", String(Date.now()));
        headers.set("Cache-Control", "public, max-age=31536000, immutable");
        const body = await res.clone().blob();
        await cache.put(req, new Response(body, { status: res.status, statusText: res.statusText, headers }));
      }
    } catch { /* quota / opaque clone — still return network response */ }
    return res;
  })());
});

// Closed-tab alerts. The page subscribes; the server pushes when a support reply arrives.
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data ? event.data.text() : "" }; }
  const title = data.title || "Support";
  const body = String(data.body || "New message").slice(0, 180);
  const icon = data.icon || "/app/icon-192.png?v=3";
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag: data.tag || "support-chat",
      icon,
      badge: icon,
      renotify: true,
      data: { url: data.url || "/chat" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path = (event.notification.data && event.notification.data.url) || "/chat";
  const url = new URL(path, self.location.origin);
  event.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of list) {
      if (new URL(client.url).pathname.startsWith(url.pathname) && "focus" in client) {
        await client.focus();
        return;
      }
    }
    if (self.clients.openWindow) await self.clients.openWindow(url.href);
  })());
});
