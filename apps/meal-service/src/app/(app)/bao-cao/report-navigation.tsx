"use client";

import { useState } from "react";

export type ReportNavigationItem = { id: string; title: string; description: string };

export function ReportNavigation({ items }: { items: ReportNavigationItem[] }) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");
  const goTo = (id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    setActiveId(id);
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", `#${id}`);
  };
  return <nav className="report-content-list" aria-label="Mục lục báo cáo">{items.map((item, index) => <button type="button" className={activeId === item.id ? "active" : ""} aria-current={activeId === item.id ? "location" : undefined} onClick={() => goTo(item.id)} key={item.id}><span className="report-nav-index">{String(index + 1).padStart(2, "0")}</span><span><strong>{item.title}</strong><small>{item.description}</small></span></button>)}</nav>;
}
