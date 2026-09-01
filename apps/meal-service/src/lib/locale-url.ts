import type { Locale } from "./locale";

export function hrefWithLocale(href: string, locale: Locale): string {
  const url = new URL(href, "http://localhost");
  url.searchParams.set("lang", locale);
  return `${url.pathname}${url.search}${url.hash}`;
}
