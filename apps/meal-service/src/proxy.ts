import { NextResponse, type NextRequest } from "next/server";
import { LOCALE_COOKIE, localeCookieOptions, localeCookieSyncValue, localeFromSearchParam } from "@/lib/locale-routing";

export function proxy(request: NextRequest) {
  const nextLocale = localeFromSearchParam(request.nextUrl.searchParams.get("lang"));
  if (!nextLocale) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.searchParams.delete("lang");
  const response = NextResponse.redirect(url);
  const syncLocale = localeCookieSyncValue(nextLocale, request.cookies.get(LOCALE_COOKIE)?.value) ?? nextLocale;
  response.cookies.set(LOCALE_COOKIE, syncLocale, localeCookieOptions());
  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
