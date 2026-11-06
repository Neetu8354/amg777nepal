import { getAdmin, ADMIN_CH, subscribe, adminConnected, adminDisconnected, sseStream, presenceJoin, presenceBeat, presenceLeave } from "@/lib/db";
import { expireCalls } from "@/lib/calls";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(req) {
  const admin = await getAdmin();
  if (!admin) return new Response("unauthorized", { status: 401 });
  // main admin hears everything; an agent only hears its own users' events
  const channel = admin.main ? ADMIN_CH : `a:${admin.agent?.id}`;
  return sseStream(
    async (write) => {
      const un = subscribe(channel, write);
      write(`event: hello\ndata: {"ok":true}\n\n`);
      const pKey = await presenceJoin("admin", null);
      await adminConnected();
      const hb = setInterval(() => { presenceBeat(pKey); expireCalls().catch(() => {}); }, 15000);
      return () => {
        clearInterval(hb);
        un();
        presenceLeave(pKey);
        adminDisconnected();
      };
    },
    () => {},
    req.signal
  );
}
