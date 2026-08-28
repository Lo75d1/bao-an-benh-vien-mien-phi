import { demoSessionEnabled, demoWorkspaceIdentity, exitDemoSession, isDemoWorkspace, resetDemoSession, setDemoWorkspace, startDemoSession } from "@/lib/demo-session";

export async function POST(request: Request) {
  if (!demoSessionEnabled()) return Response.json({ error: "Không có trên production." }, { status: 404 });
  const body = await request.json().catch(() => ({}));
  const action = String(body?.action ?? "start");
  const workspace = isDemoWorkspace(body?.workspace) ? body.workspace : "NURSE";
  try {
    if (action === "start") await startDemoSession(workspace);
    else if (action === "switch") await setDemoWorkspace(workspace);
    else if (action === "reset") await resetDemoSession();
    else return Response.json({ error: "Thao tác Demo không hợp lệ." }, { status: 400 });
    return Response.json({ href: demoWorkspaceIdentity(workspace).href });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Không thể cập nhật Demo Session." }, { status: 400 }); }
}
export async function DELETE() { if (!demoSessionEnabled()) return new Response(null, { status: 404 }); await exitDemoSession(); return new Response(null, { status: 204 }); }
