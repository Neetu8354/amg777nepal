# amg777 Customer Support

A WhatsApp-style
24x7 live support chat as an installable PWA, built with Next.js + React.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000

## What's included

| Area | Details |
|---|---|
| **Login** (`/verify`) | Dark/gold card, +92 mobile login (10-digit). Creates/finds the user and drops you into chat. Method buttons (WhatsApp OTP, WhatsApp link, Telegram, password) render only when enabled via `/api/auth/methods`. |
| **Chat** (`/chat`) | WhatsApp-style UI: green header, avatar, online/typing/last-seen status, date dividers, bubble tails, ✓/✓✓ + blue read ticks, reply quotes, edit marks, link previews, emoji picker, sticker picker, image/video upload (≤5MB/≤50MB) with caption preview + progress bar, voice messages, message context sheet (Reply/Copy/Edit/Delete), toasts, block bar. |
| **Calls** | Real WebRTC voice calls between customer and agent (signaling over SSE + REST). Ringing/connecting/connected states, call timer, mute, hold, remote-mute/hold notes, decline, timeout → missed, full-screen overlay + draggable mini card, call history rows in the timeline. |
| **Real-time** | Server-Sent Events (`/api/chat/events`, `/api/admin/events`): messages, delivered/read receipts, typing, presence, block, edit, delete, call signaling. |
| **Admin console** (`/admin`) | Agent login, customer list (online dot, unread badge, last message, search), conversation pane (reply, image attach, typing indicator, block/unblock, delete), initiate/answer calls. Default login: `admin` / `amg777` (change via `SG_ADMIN_USER` / `SG_ADMIN_PASS`). |
| **PWA** | `manifest.json`, service worker (image caching, offline retry page, push notifications), install banner with per-platform install guide (iOS/Android/Mac/desktop) + install progress overlay. |
| **Notifications** | Web-push (VAPID) — subscribe from the in-app prompt; replies push to the user's device even when the tab is closed. |
| **Bot fallback** | When no agent is connected, an auto-reply bot answers (set `SG_AUTOREPLY=0` to disable). |
| **Other** | `/social` links landing page, visit/geo tracking (`/api/track/*`), uploads served from `/u/*`. |

## Layout

```
app/
  verify/page.jsx      login screen
  chat/page.jsx        customer chat
  admin/page.jsx       agent console
  social/page.jsx      links page
  api/                 all REST + SSE endpoints
components/            InstallApp, NotifyPrompt, CallUI, ChatBits, VisitBeacon, SwRegister
lib/                   db.js (store, SSE bus, presence, bot, push), calls.js, preview.js, client.js
public/                manifest.json, sw.js, app icons
data/                  runtime: db.json, uploads/, vapid.json (auto-created, gitignored)
```

## Login methods

Same `/api/auth/methods` flags as the live site — off by default, enable via env:

| Flag | Effect |
|---|---|
| `SG_AUTH_PLAIN` | mobile-only login (default on; `=0` to disable) |
| `SG_AUTH_PASSWORD=1` | password create/login step |
| `SG_AUTH_WAOTP=1` | "Login with OTP" — sends a 6-digit code (returned as `dev_code` for demo) |
| `SG_AUTH_WAMSG=1` | "Login with WhatsApp" — code + wa.me link; the page polls `/api/auth/wa/status` and logs in automatically |
| `SG_AUTH_TELEGRAM=1` | Telegram button (stub — needs a real bot token) |
| `SG_ADMIN_USER` / `SG_ADMIN_PASS` | admin console credentials (default `admin` / `amg777`) |
| `SG_AUTOREPLY=0` | disable the fallback bot |

## Supabase (optional)

1. Create a project at supabase.com → SQL editor → run `supabase/schema.sql`.
2. Copy `.env.local.example` → `.env.local` and fill `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.
3. `npm run dev` — on boot it hydrates existing data from Supabase and then mirrors
   every write (users, sessions, messages, edits/deletes, read/delivered state,
   blocks, push subs, visits) to Postgres. Live presence/SSE stays in-memory.
   Without the env vars it silently falls back to `data/db.json`.

## Notes

- Sessions are cookie-based (`sg_session` user, `sg_admin` agent); data persists to `data/db.json`.
- Calls need two open clients (customer on `/chat`, agent on `/admin`) — mic permission required; works on localhost/LAN.
- Media uploads land in `data/uploads/` and are served from `/u/<file>`.

## Deploy to Vercel (serverless)

The app is serverless-ready: Postgres holds all state, Realtime broadcast carries
live events between instances, `sg_presence`/`sg_calls` replace in-memory maps,
and uploads go to the `sg-media` Storage bucket.

1. Run `supabase/migrate-v2.sql` in the Supabase SQL editor (once).
2. Push the `amg777-app` folder to a Git repo → import in Vercel.
3. Vercel env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
   (optional: `SG_ADMIN_USER`, `SG_ADMIN_PASS`, `SG_AUTOREPLY=0`, auth flags).
4. Deploy. SSE reconnects automatically if a stream hits the function limit.

Local dev without Supabase still works exactly as before (JSON + disk uploads).
