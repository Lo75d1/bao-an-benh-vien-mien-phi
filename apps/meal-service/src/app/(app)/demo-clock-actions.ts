"use server";

import { redirect } from "next/navigation";
import { DEMO_TIME_PARAM, parsePageDemoTime } from "@/lib/request-clock";

function safeReturnUrl(value: FormDataEntryValue | null) {
  const path = String(value ?? "/");
  if (!path.startsWith("/") || path.startsWith("//")) return new URL("http://demo.local/");
  return new URL(path, "http://demo.local");
}

export async function updateDemoClockAction(formData: FormData) {
  const returnUrl = safeReturnUrl(formData.get("returnTo"));
  if (process.env.DEMO_MODE !== "1") redirect(`${returnUrl.pathname}${returnUrl.search}`);
  returnUrl.searchParams.delete("demoTour");
  const mode = String(formData.get("mode") ?? "");
  if (mode === "REAL") {
    returnUrl.searchParams.delete(DEMO_TIME_PARAM);
    redirect(`${returnUrl.pathname}${returnUrl.search}`);
  }
  const realNow = new Date();
  let target: Date | null = null;
  if (mode === "STEP") {
    const minutes = Number(formData.get("minutes"));
    const current = parsePageDemoTime(formData.get("currentNow"), realNow) ?? realNow;
    if (Number.isInteger(minutes) && minutes !== 0 && Math.abs(minutes) <= 1_440)
      target = new Date(current.getTime() + minutes * 60_000);
  } else if (mode === "SET") {
    target = parsePageDemoTime(String(formData.get("now") ?? ""), realNow);
  }
  if (!target) throw new Error("Hãy chọn một mốc thời gian Demo hợp lệ.");
  returnUrl.searchParams.set(DEMO_TIME_PARAM, target.toISOString());
  redirect(`${returnUrl.pathname}${returnUrl.search}`);
}
