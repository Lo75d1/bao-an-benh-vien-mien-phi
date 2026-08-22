import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getSessionUser();
  if (!user || user.role !== "DIETITIAN") return Response.json({ sources: [], groups: [] }, { status: 401 });
  const [sources, groups] = await Promise.all([
    prisma.food.findMany({ where: { source: { not: null } }, distinct: ["source"], orderBy: { source: "asc" }, select: { source: true } }),
    prisma.food.findMany({ where: { foodGroup: { not: null } }, distinct: ["foodGroup"], orderBy: { foodGroup: "asc" }, select: { foodGroup: true } }),
  ]);
  return Response.json({ sources: sources.flatMap((row) => row.source ? [row.source] : []), groups: groups.flatMap((row) => row.foodGroup ? [row.foodGroup] : []) });
}
