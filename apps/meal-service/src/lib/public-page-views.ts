import { createHash } from "node:crypto";
import { prisma } from "./prisma";
import { hospitalDate } from "./serving-report";

export function hashPublicVisitor(visitorId: string): string {
  return createHash("sha256").update(visitorId).digest("base64url");
}

export async function recordPublicPageView(visitorId: string, now = new Date()) {
  const viewedOn = hospitalDate(now);
  const visitorHash = hashPublicVisitor(visitorId);
  return prisma.publicPageView.upsert({
    where: { viewedOn_visitorHash: { viewedOn, visitorHash } },
    create: { viewedOn, visitorHash },
    update: {},
    select: { id: true },
  });
}

export async function readPublicViewStats(now = new Date()) {
  const today = hospitalDate(now);
  const [total, todayTotal] = await Promise.all([
    prisma.publicPageView.count(),
    prisma.publicPageView.count({ where: { viewedOn: today } }),
  ]);
  return { total, today: todayTotal };
}
