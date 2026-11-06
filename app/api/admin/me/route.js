import { getAdmin } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getAdmin();
  if (!admin) return Response.json({ success: false });
  return Response.json({
    success: true,
    role: admin.main ? "main" : "agent",
    agent: admin.agent
      ? { id: admin.agent.id, name: admin.agent.name, username: admin.agent.username }
      : null,
  });
}
