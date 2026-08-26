import "server-only";
export type RequestClock = { now: Date; enabled: boolean; simulated: boolean };

export async function readRequestClock(): Promise<RequestClock> {
  return { now: new Date(), enabled: false, simulated: false };
}
