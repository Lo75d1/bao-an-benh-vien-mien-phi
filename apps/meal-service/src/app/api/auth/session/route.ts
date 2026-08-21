import { clearSession, getSessionUser } from "@/lib/auth";
export async function GET() { return Response.json({ user: await getSessionUser() }); }
export async function DELETE() { await clearSession(); return new Response(null, { status: 204 }); }
