import "server-only";
import { cookies } from "next/headers";

export const DEMO_CLOCK_COOKIE = "meal_service_demo_now";
export type RequestClock = { now: Date; enabled: boolean; simulated: boolean };

export function parseDemoClockValue(value: string | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function readRequestClock(): Promise<RequestClock> {
  const enabled = process.env.DEMO_MODE === "1";
  if (!enabled) return { now: new Date(), enabled: false, simulated: false };
  const parsed = parseDemoClockValue((await cookies()).get(DEMO_CLOCK_COOKIE)?.value);
  if (!parsed) return { now: new Date(), enabled: true, simulated: false };
  return { now: parsed, enabled: true, simulated: true };
}
