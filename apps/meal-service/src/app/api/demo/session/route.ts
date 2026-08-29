import {
  demoSessionEnabled,
  demoWorkspaceIdentity,
  exitDemoSession,
  isDemoWorkspace,
  readDemoSession,
  resetDemoSession,
  setDemoWorkspace,
  startDemoSession,
  updateDemoTourProgress,
} from "@/lib/demo-session";
import { publicDemoError } from "@/lib/demo-public-error";

export async function GET() {
  if (!demoSessionEnabled())
    return Response.json(
      { error: "Không có trên production." },
      { status: 404 },
    );
  const session = await readDemoSession();
  if (!session)
    return Response.json({ error: "Phiên Demo đã hết hạn." }, { status: 401 });
  return Response.json({
    workspace: session.workspace,
    tour: session.state.tour,
  });
}

export async function POST(request: Request) {
  if (!demoSessionEnabled())
    return Response.json(
      { error: "Không có trên production." },
      { status: 404 },
    );
  const body = await request.json().catch(() => ({}));
  const action = String(body?.action ?? "start");
  const workspace = isDemoWorkspace(body?.workspace) ? body.workspace : "NURSE";
  try {
    if (action === "start") await startDemoSession(workspace);
    else if (action === "switch") await setDemoWorkspace(workspace);
    else if (action === "reset") await resetDemoSession();
    else if (action === "tour") {
      const session = await readDemoSession();
      if (!session) throw new Error("Phiên Demo đã hết hạn.");
      const status = body?.status;
      const step = Number(body?.step);
      if (
        !(
          status === "NOT_STARTED" ||
          status === "ACTIVE" ||
          status === "DONE"
        ) ||
        !Number.isInteger(step) ||
        step < 0
      )
        throw new Error("Tiến độ hướng dẫn không hợp lệ.");
      await updateDemoTourProgress(session.workspace, { status, step });
    } else
      return Response.json(
        { error: "Thao tác Demo không hợp lệ." },
        { status: 400 },
      );
    return Response.json({ href: demoWorkspaceIdentity(workspace).href });
  } catch (error) {
    const safe = publicDemoError(error);
    return Response.json(
      { error: safe.message },
      { status: safe.status },
    );
  }
}
export async function DELETE() {
  if (!demoSessionEnabled()) return new Response(null, { status: 404 });
  await exitDemoSession();
  return new Response(null, { status: 204 });
}
