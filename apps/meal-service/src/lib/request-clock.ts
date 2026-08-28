import "server-only";
import { headers } from "next/headers";
import {
  DEMO_TIME_PARAM,
  DEMO_TOUR_TIME_PARAM,
  pageRequestClock,
  type RequestClock,
} from "./page-demo-time";

export {
  DEMO_TIME_PARAM,
  DEMO_TOUR_TIME_PARAM,
  pageRequestClock,
  parsePageDemoTime,
} from "./page-demo-time";

export async function readRequestClock(
  value?: unknown,
  tourActive = false,
): Promise<RequestClock> {
  return pageRequestClock(value, new Date(), undefined, tourActive);
}

// Server Actions receive the current page URL as referrer. Demo time is read only
// from that page URL, never from a global cookie or server-side mutable state.
export async function readActionClock(): Promise<RequestClock> {
  if (process.env.DEMO_MODE !== "1") return pageRequestClock(null);
  const referrer = (await headers()).get("referer");
  if (!referrer) return pageRequestClock(null);
  try {
    const url = new URL(referrer);
    return pageRequestClock(
      url.searchParams.get(DEMO_TIME_PARAM),
      new Date(),
      undefined,
      url.searchParams.get(DEMO_TOUR_TIME_PARAM) === "1",
    );
  } catch {
    return pageRequestClock(null);
  }
}
