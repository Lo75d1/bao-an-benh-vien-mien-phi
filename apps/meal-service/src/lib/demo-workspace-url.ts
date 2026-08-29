import { DEMO_TIME_PARAM } from "./page-demo-time";

export function workspaceHrefWithDemoTime(href: string, demoNow?: string | null) {
  if (!demoNow) return href;
  const target = new URL(href, "http://demo.local");
  target.searchParams.set(DEMO_TIME_PARAM, demoNow);
  return `${target.pathname}${target.search}${target.hash}`;
}
