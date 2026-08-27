import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const SOURCES = new Set(["VDD_FOOD", "VDD_DISH", "RNI_DISH"]);
const csv = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") return new Response("Không có quyền truy cập.", { status: 403 });
  const source = new URL(request.url).searchParams.get("source") ?? "";
  if (!SOURCES.has(source)) return new Response("Nguồn dữ liệu không hợp lệ.", { status: 400 });
  let lines: string[];
  if (source === "VDD_FOOD") {
    const rows = await prisma.food.findMany({ where: { source: "VDD" }, orderBy: { name: "asc" }, select: { sourceCode: true, name: true, energyKcal: true, proteinG: true, lipidG: true, glucidG: true } });
    lines = ["Ma nguon,Ten,Nang luong kcal,Protein g,Lipid g,Glucid g", ...rows.map((row) => [row.sourceCode, row.name, row.energyKcal, row.proteinG, row.lipidG, row.glucidG].map(csv).join(","))];
  } else {
    const rows = await prisma.dish.findMany({ where: { source: source === "VDD_DISH" ? "VDD" : "RNI" }, orderBy: { name: "asc" }, select: { sourceCode: true, name: true, totalWeightG: true, servingUnit: true, isActive: true } });
    lines = ["Ma nguon,Ten,Khoi luong g,Don vi,Trang thai", ...rows.map((row) => [row.sourceCode, row.name, row.totalWeightG, row.servingUnit, row.isActive ? "Dang dung" : "Ngung dung"].map(csv).join(","))];
  }
  return new Response(`\uFEFF${lines.join("\r\n")}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="du-lieu-${source.toLowerCase()}.csv"`, "Cache-Control": "private, no-store" } });
}
