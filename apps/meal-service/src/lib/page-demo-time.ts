export const DEMO_TIME_PARAM = "demoNow";

export type RequestClock = {
  now: Date;
  enabled: boolean;
  simulated: boolean;
};

export function parsePageDemoTime(
  value: unknown,
  _realNow = new Date(),
): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed;
}

export function pageRequestClock(
  value: unknown,
  realNow = new Date(),
  demoEnabled = process.env.DEMO_MODE === "1",
): RequestClock {
  if (!demoEnabled) return { now: realNow, enabled: false, simulated: false };
  const pageDemoTime = parsePageDemoTime(value, realNow);
  return { now: pageDemoTime ?? realNow, enabled: true, simulated: pageDemoTime !== null };
}
