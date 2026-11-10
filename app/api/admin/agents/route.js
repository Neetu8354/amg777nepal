import { getAdmin } from "@/lib/db";
import { listAgents, createAgent, updateAgent, deleteAgent } from "@/lib/agents";

export const dynamic = "force-dynamic";

async function mainOnly() {
  const admin = await getAdmin();
  return admin?.main ? admin : null;
}

export async function GET() {
  if (!(await mainOnly())) return Response.json({ success: false }, { status: 401 });
  return Response.json({ success: true, agents: await listAgents() });
}

export async function POST(req) {
  if (!(await mainOnly())) return Response.json({ success: false }, { status: 401 });
  let b = {};
  try { b = await req.json(); } catch {}
  if (b.action === "delete") {
    const r = await deleteAgent(Number(b.id));
    if (r.error) return Response.json({ success: false, error: r.error }, { status: 400 });
    return Response.json(r);
  }
  if (b.action === "update") return Response.json(await updateAgent(Number(b.id), b));
  const r = await createAgent(b);
  if (r.error) return Response.json({ success: false, error: r.error }, { status: 400 });
  return Response.json({ success: true, agent: r });
}
