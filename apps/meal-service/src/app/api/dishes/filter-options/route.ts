import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user || user.role !== "DIETITIAN") return Response.json({ categories: [], ageGroups: [], diseaseGroups: [] }, { status: 401 });
  return Response.json({ categories: [], ageGroups: [], diseaseGroups: [] });
}
