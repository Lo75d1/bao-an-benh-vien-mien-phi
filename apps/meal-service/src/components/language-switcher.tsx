"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition, type ReactNode } from "react";
import { Check } from "lucide-react";
import type { Locale } from "@/lib/locale";
import { localeLabel, setLocaleCookie } from "@/lib/locale";

const OPTIONS: Array<{ value: Locale; label: string }> = [
  { value: "vi", label: localeLabel("vi") },
  { value: "en", label: "English" },
];

function Switcher({
  current,
  children,
}: {
  current: Locale;
  children: ReactNode;
}) {
  return (
    <details className="language-switcher">
      <summary>
        {current === "vi" ? "VI ▾" : "EN ▾"}
      </summary>
      {children}
    </details>
  );
}

export function StaffLanguageSwitcher({ current }: { current: Locale }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  function update(next: Locale) {
    setLocaleCookie(next);
    startTransition(() => router.refresh());
  }

  return (
    <Switcher current={current}>
      <div className="language-switcher-menu">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className="language-option"
            aria-current={current === option.value ? "true" : undefined}
            onClick={() => update(option.value)}
          >
            {current === option.value ? (
              <Check className="size-4" aria-hidden="true" />
            ) : (
              <span className="size-4" />
            )}
            {option.label}
          </button>
        ))}
      </div>
    </Switcher>
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
    <nav className="public-language-switcher" aria-label="Language">
      {OPTIONS.map((option) => (
        <Link
          key={option.value}
          href={hrefs[option.value]}
          aria-current={current === option.value ? "page" : undefined}
          onClick={() => setLocaleCookie(option.value)}
        >
          {option.value.toUpperCase()}
        </Link>
      ))}
    </nav>
  );
}
