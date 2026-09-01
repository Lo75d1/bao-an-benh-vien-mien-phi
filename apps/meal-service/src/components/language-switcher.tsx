"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { Locale } from "@/lib/locale";
import { setLocaleCookie } from "@/lib/locale";

const OPTIONS: Array<{ value: Locale; label: string }> = [
  { value: "vi", label: "VI" },
  { value: "en", label: "EN" },
];

export function StaffLanguageSwitcher({ current }: { current: Locale }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  function update(next: Locale) {
    setLocaleCookie(next);
    startTransition(() => router.refresh());
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
  return (
    <nav className="language-segmented-control public-language-switcher" aria-label="Language">
      {OPTIONS.map((option) => (
        <Link
          key={option.value}
          href={hrefs[option.value]}
          className="language-segment"
          aria-current={current === option.value ? "page" : undefined}
          onClick={() => setLocaleCookie(option.value)}
        >
          {option.label}
        </Link>
      ))}
    </nav>
  );
}
