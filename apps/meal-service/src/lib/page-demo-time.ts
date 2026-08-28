export const DEMO_TIME_PARAM = "demoNow";
export const DEMO_TOUR_TIME_PARAM = "demoTour";

export type RequestClock = {
  now: Date;
  enabled: boolean;
  simulated: boolean;
};

export function parsePageDemoTime(
  value: unknown,
  realNow = new Date(),
  allowPastForTour = false,
): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  const currentMinute = new Date(realNow);
  currentMinute.setSeconds(0, 0);
  return !allowPastForTour && parsed.getTime() < currentMinute.getTime()
    ? null
    : parsed;
}

export function pageRequestClock(
  value: unknown,
  realNow = new Date(),
  demoEnabled = process.env.DEMO_MODE === "1",
  tourActive = false,
): RequestClock {
  if (!demoEnabled) return { now: realNow, enabled: false, simulated: false };
  const pageDemoTime = parsePageDemoTime(value, realNow, tourActive);
  return { now: pageDemoTime ?? realNow, enabled: true, simulated: pageDemoTime !== null };
}
