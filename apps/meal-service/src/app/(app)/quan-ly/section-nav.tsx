"use client";

import { useEffect, useState } from "react";

const SECTIONS = [{ id: "xu-ly-hien-tai", label: "Xử lý hiện tại" }, { id: "schedule-heading", label: "Lịch xuất ăn" }] as const;

export function SectionNav() {
  const [active, setActive] = useState<(typeof SECTIONS)[number]["id"]>(SECTIONS[0].id);
  useEffect(() => {
    const elements = SECTIONS.flatMap(({ id }) => { const element = document.getElementById(id); return element ? [element] : []; });
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActive(visible.target.id as (typeof SECTIONS)[number]["id"]);
    }, { rootMargin: "-72px 0px -55% 0px", threshold: [0, 0.1, 0.5] });
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);
  return <nav className="management-section-nav" aria-label="Mục lục trang quản lý">{SECTIONS.map((section) => <a key={section.id} href={`#${section.id}`} aria-current={active === section.id ? "location" : undefined}>{section.label}</a>)}</nav>;
}
