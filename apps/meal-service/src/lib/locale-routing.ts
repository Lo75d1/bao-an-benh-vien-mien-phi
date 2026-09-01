import type { Locale } from "./locale";

export const LOCALE_COOKIE = "suatan_locale";

function normalizeCookieLocale(value: string | undefined): Locale {
  return value === "en" ? "en" : "vi";
}

export function localeFromSearchParam(value: string | null): Locale | null {
  return value === "vi" || value === "en" ? value : null;
}

export function localeCookieSyncValue(queryLocale: string | null, cookieLocale: string | undefined): Locale | null {
  const next = localeFromSearchParam(queryLocale);
  if (!next) return null;
  return normalizeCookieLocale(cookieLocale) === next ? null : next;
}

export function localeCookieOptions() {
  return {
    path: "/",
    maxAge: 31_536_000,
    sameSite: "lax" as const,
    secure: process.env.INSECURE_COOKIES !== "1" && process.env.NODE_ENV === "production",
  };
}
