"use client";

import Link from "next/link";
import type { Language } from "@/lib/i18n";
import { changeLanguageAction } from "@/app/(app)/ho-so/actions";

const OPTIONS: Array<{ value: Language; label: string }> = [
  { value: "vi", label: "VI" },
  { value: "en", label: "EN" },
];

export function StaffLanguageSwitcher({ current }: { current: Language }) {
  return (
    <form action={changeLanguageAction} className="language-segmented-control" aria-label="Language">
      {OPTIONS.map((option) => (
        <button key={option.value} type="submit" name="language" value={option.value} className="language-segment" aria-current={current === option.value ? "true" : undefined}>
          {option.label}
        </button>
      ))}
    </form>
  );
}

export function PublicLanguageSwitcher({ current, hrefs }: { current: Language; hrefs: Record<Language, string> }) {
  return (
    <nav className="language-segmented-control public-language-switcher" aria-label="Language">
      {OPTIONS.map((option) => (
        <Link key={option.value} href={hrefs[option.value]} className="language-segment" aria-current={current === option.value ? "page" : undefined}>
          {option.label}
        </Link>
      ))}
    </nav>
  );
}
