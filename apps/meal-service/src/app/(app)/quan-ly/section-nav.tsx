"use client";

import { useEffect, useState } from "react";
import { getTranslations, readClientLocale } from "@/lib/locale";

const SECTIONS = [
  { id: "xu-ly-hien-tai", key: "sectionCurrent" },
  { id: "schedule-heading", key: "sectionSchedule" },
] as const;

export function SectionNav() {
  const [active, setActive] = useState<(typeof SECTIONS)[number]["id"]>(SECTIONS[0].id);
  const locale = readClientLocale();
  const t = getTranslations(locale).management;

  useEffect(() => {
    const elements = SECTIONS.flatMap(({ id }) => {
      const element = document.getElementById(id);
      return element ? [element] : [];
    });
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id as (typeof SECTIONS)[number]["id"]);
      },
      { rootMargin: "-72px 0px -55% 0px", threshold: [0, 0.1, 0.5] },
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return (
    <nav className="management-section-nav" aria-label={t.sectionNav}>
      {SECTIONS.map((section) => (
        <a key={section.id} href={`#${section.id}`} aria-current={active === section.id ? "location" : undefined}>
          {t[section.key]}
        </a>
      ))}
    </nav>
  );
}
