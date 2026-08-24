"use client";

import { useState } from "react";

export type ReportNavigationItem = { id: string; content: string; title: string; description: string };

export function ReportNavigation({ items, selected }: { items: ReportNavigationItem[]; selected: string[] }) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");
  const [checkedContents, setCheckedContents] = useState(() => new Set(selected));
  const goTo = (id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    setActiveId(id);
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", `#${id}`);
  };
  const toggle = (content: string, checked: boolean) => setCheckedContents((current) => { if (!checked && current.size === 1 && current.has(content)) return current; const next = new Set(current); if (checked) next.add(content); else next.delete(content); return next; });
  return <nav className="report-content-list" aria-label="Mục lục báo cáo">{items.map((item, index) => <div className={activeId === item.id ? "active" : ""} key={item.id}><label title={`Chọn ${item.title}`}><input form="report-scope-form" type="checkbox" name="content" value={item.content} checked={checkedContents.has(item.content)} onChange={(event) => toggle(item.content, event.target.checked)}/><span className="sr-only">Chọn {item.title}</span></label><button type="button" aria-current={activeId === item.id ? "location" : undefined} onClick={() => goTo(item.id)}><span className="report-nav-index">{String(index + 1).padStart(2, "0")}</span><span><strong>{item.title}</strong><small>{item.description}</small></span></button></div>)}</nav>;
}
