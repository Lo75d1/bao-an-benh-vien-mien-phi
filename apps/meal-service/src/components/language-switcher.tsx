"use client";

import Link from "next/link";
import { Globe, Check } from "lucide-react";
import type { Language } from "@/lib/i18n";
import { changeLanguageAction } from "@/app/(app)/ho-so/actions";

const OPTIONS: Array<{ value: Language; label: string }> = [
  { value: "vi", label: "Tiếng Việt" },
  { value: "en", label: "English" },
];

export function StaffLanguageSwitcher({ current }: { current: Language }) {
  return (
    <details className="language-switcher">
      <summary><Globe aria-hidden="true" /> {current === "vi" ? "VI ▾" : "EN ▾"}</summary>
      <form action={changeLanguageAction} className="language-switcher-menu">
        {OPTIONS.map((option) => (
          <button key={option.value} type="submit" name="language" value={option.value} className="language-option" aria-current={current === option.value ? "true" : undefined}>
            {current === option.value ? <Check className="size-4" aria-hidden="true" /> : <span className="size-4" />}
            {option.label}
          </button>
        ))}
      </form>
    </details>
  );
}

export function PublicLanguageSwitcher({ current, hrefs }: { current: Language; hrefs: Record<Language, string> }) {
  return (
    <details className="language-switcher">
      <summary><Globe aria-hidden="true" /> {current === "vi" ? "VI ▾" : "EN ▾"}</summary>
      <div className="language-switcher-menu">
        {OPTIONS.map((option) => (
          <Link key={option.value} href={hrefs[option.value]} className="language-option" aria-current={current === option.value ? "page" : undefined}>
            {current === option.value ? <Check className="size-4" aria-hidden="true" /> : <span className="size-4" />}
            {option.label}
          </Link>
        ))}
      </div>
    </details>
  );
}
