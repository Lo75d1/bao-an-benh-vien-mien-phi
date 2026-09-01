import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeDishSearchResult } from "@/lib/menu-search-result";

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || !["DIETITIAN", "ADMIN"].includes(user.role)) return Response.json({ items: [] }, { status: 401 });
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").toLowerCase();
  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get("limit")) || 30, 1), 40);
  if (!q) return Response.json({ items: [] });
  const items = await prisma.dish.findMany({ where: { isActive: true, nameNormalized: { contains: q } }, orderBy: { name: "asc" }, take: limit, select: { id: true, name: true, source: true, totalWeightG: true, servingUnit: true, ingredients: { orderBy: { sortOrder: "asc" }, select: { id: true, foodNameRaw: true, quantityG: true, food: { select: { id: true, name: true, source: true, foodType: true, foodGroup: true, wastePercent: true, energyKcal: true, proteinG: true, lipidG: true, glucidG: true, sodiumMg: true, potassiumMg: true, waterG: true } } } } } });
  return Response.json({ items: items.map((item) => serializeDishSearchResult(item)) });
}
