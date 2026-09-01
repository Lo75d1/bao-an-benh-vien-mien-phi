import { cookies } from "next/headers";
import { normalizeLocale, LOCALE_COOKIE, type Locale } from "@/lib/locale";

export async function readLocale(): Promise<Locale> {
  const store = await cookies();
  return normalizeLocale(store.get(LOCALE_COOKIE)?.value);
}
