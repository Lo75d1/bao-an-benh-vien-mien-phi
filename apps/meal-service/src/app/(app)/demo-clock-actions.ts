"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEMO_CLOCK_COOKIE, readRequestClock } from "@/lib/request-clock";
import { prisma } from "@/lib/prisma";
import { seedDemo } from "../../../scripts/seed-demo";

function safeReturnTo(value: FormDataEntryValue | null) {
  const path = String(value ?? "/");
  return path.startsWith("/") && !path.startsWith("//") ? path : "/";
}

export async function updateDemoClockAction(formData: FormData) {
  const returnTo = safeReturnTo(formData.get("returnTo"));
  if (process.env.DEMO_MODE !== "1") redirect(returnTo);
  const store = await cookies();
  const mode = String(formData.get("mode") ?? "");
  if (mode === "REAL") {
    store.set(DEMO_CLOCK_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
    redirect(returnTo);
  }
  let target: Date;
  if (mode === "STEP") {
    const minutes = Number(formData.get("minutes"));
    if (!Number.isInteger(minutes) || Math.abs(minutes) > 1_440) throw new Error("Bước tua thời gian không hợp lệ.");
    const current = await readRequestClock();
    target = new Date(current.now.getTime() + minutes * 60_000);
  } else {
    const value = String(formData.get("now") ?? "");
    target = new Date(`${value}:00+07:00`);
  }
  if (Number.isNaN(target.getTime())) throw new Error("Thời gian demo không hợp lệ.");
  await seedDemo(prisma, target, { resetScenario: true });
  store.set(DEMO_CLOCK_COOKIE, target.toISOString(), { httpOnly: true, sameSite: "lax", path: "/" });
  redirect(returnTo);
}
