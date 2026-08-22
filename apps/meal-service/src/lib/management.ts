import "server-only";

import { prisma } from "./prisma";
import { hospitalDate } from "./serving-report";

export const MANAGEMENT_STATUSES = ["PLANNED", "LOCKED", "PREPARING", "PREPARED", "SERVED"] as const;
export type ManagementStatus = (typeof MANAGEMENT_STATUSES)[number];
export type ManagementDiet = { id: string; code: string; name: string; status: ManagementStatus; servings: number };
export type ManagementDepartment = { id: string; code: string; name: string; reportId: string | null; submittedAt: string | null; totalServings: number | null; lines: Array<{ dietCode: string; dietName: string; quantity: number }> };
export type ManagementMeal = { id: string; name: string; serviceTime: string; focus: "CURRENT" | "NEXT" | "OTHER"; totalDiets: number; statusCounts: Record<(typeof MANAGEMENT_STATUSES)[number], number>; diets: ManagementDiet[]; departments: ManagementDepartment[]; reportedDepartmentCount: number; totalDepartmentCount: number; reportedServings: number | null };
export type ManagementDay = { date: string; meals: ManagementMeal[]; departmentCount: number };

function parseHospitalDay(value: string | undefined, now: Date): Date {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return hospitalDate(now);
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value ? hospitalDate(now) : parsed;
}

function serviceAt(day: Date, time: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), hour - 7, minute);
}

export async function readManagementDay(date?: string, now = new Date()): Promise<ManagementDay> {
  const day = parseHospitalDay(date, now);
  const [departments, events] = await Promise.all([
    prisma.department.findMany({ where: { status: "ACTIVE" }, orderBy: [{ code: "asc" }, { name: "asc" }], select: { id: true, code: true, name: true } }),
    prisma.mealEvent.findMany({
      where: { mealDate: day }, orderBy: { mealType: { sortOrder: "asc" } },
      select: {
        id: true, mealType: { select: { name: true, serviceTime: true } },
        dietMeals: { where: { voidedAt: null, status: { not: "CANCELLED" } }, orderBy: { dietType: { sortOrder: "asc" } }, select: { id: true, status: true, servingsPlanned: true, dietType: { select: { code: true, name: true } } } },
        reports: { where: { status: "SUBMITTED" }, select: { id: true, departmentId: true, submittedAt: true, lines: { orderBy: { dietType: { sortOrder: "asc" } }, select: { quantity: true, dietType: { select: { code: true, name: true } } } } } },
      },
    }),
  ]);
  const selectedIsToday = day.getTime() === hospitalDate(now).getTime();
  const serviceTimes = events.map((event) => serviceAt(day, event.mealType.serviceTime));
  let nextIndex = selectedIsToday ? serviceTimes.findIndex((time) => time !== null && time >= now.getTime()) : -1;
  if (nextIndex < 0 && selectedIsToday && events.length > 0) nextIndex = events.length - 1;
  const currentIndex = selectedIsToday && nextIndex > 0 ? nextIndex - 1 : -1;

  return { date: day.toISOString().slice(0, 10), departmentCount: departments.length, meals: events.map((event, index) => {
    const reportByDepartment = new Map(event.reports.map((report) => [report.departmentId, report]));
    const statusCounts = Object.fromEntries(MANAGEMENT_STATUSES.map((status) => [status, 0])) as ManagementMeal["statusCounts"];
    for (const meal of event.dietMeals) statusCounts[meal.status as ManagementStatus] += 1;
    const departmentRows = departments.map((department) => {
      const report = reportByDepartment.get(department.id);
      return { ...department, reportId: report?.id ?? null, submittedAt: report?.submittedAt?.toISOString() ?? null, totalServings: report ? report.lines.reduce((sum, line) => sum + line.quantity, 0) : null, lines: report?.lines.map((line) => ({ dietCode: line.dietType.code, dietName: line.dietType.name, quantity: line.quantity })) ?? [] };
    });
    const submitted = departmentRows.filter((department) => department.reportId !== null);
    return { id: event.id, name: event.mealType.name, serviceTime: event.mealType.serviceTime, focus: index === nextIndex ? "NEXT" : index === currentIndex ? "CURRENT" : "OTHER", totalDiets: event.dietMeals.length, statusCounts, diets: event.dietMeals.map((meal) => ({ id: meal.id, code: meal.dietType.code, name: meal.dietType.name, status: meal.status as ManagementStatus, servings: meal.servingsPlanned })), departments: departmentRows, reportedDepartmentCount: submitted.length, totalDepartmentCount: departments.length, reportedServings: submitted.length > 0 ? submitted.reduce((sum, department) => sum + (department.totalServings ?? 0), 0) : null };
  }) };
}
