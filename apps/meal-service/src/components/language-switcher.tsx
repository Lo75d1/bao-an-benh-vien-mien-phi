"use client";

import Link from "next/link";
import type { MouseEvent } from "react";
import type { Locale } from "@/lib/locale";
import { setLocaleCookie } from "@/lib/locale";
import { hrefWithLocale } from "@/lib/locale-url";

const OPTIONS: Array<{ value: Locale; label: string }> = [
  { value: "vi", label: "VI" },
  { value: "en", label: "EN" },
];

export function StaffLanguageSwitcher({ current }: { current: Locale }) {
  function update(next: Locale) {
    setLocaleCookie(next);
    const nextHref = hrefWithLocale(`${window.location.pathname}${window.location.search}${window.location.hash}`, next);
    window.location.assign(nextHref);
  }

  return (
    <div className="language-segmented-control" aria-label="Language">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className="language-segment"
          aria-current={current === option.value ? "true" : undefined}
          onClick={() => update(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function PublicLanguageSwitcher({
  current,
  hrefs,
}: {
  current: Locale;
  hrefs: Record<Locale, string>;
}) {
  function update(event: MouseEvent<HTMLAnchorElement>, next: Locale) {
    event.preventDefault();
    setLocaleCookie(next);
    window.location.assign(hrefs[next]);
  }

  return (
    <nav className="language-segmented-control public-language-switcher" aria-label="Language">
      {OPTIONS.map((option) => (
        <Link
          key={option.value}
          href={hrefs[option.value]}
          className="language-segment"
          aria-current={current === option.value ? "page" : undefined}
          onClick={(event) => update(event, option.value)}
        >
          {option.label}
        </Link>
      ))}
    </nav>
  );
}
