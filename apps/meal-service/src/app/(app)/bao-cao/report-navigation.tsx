"use client";

import { useState } from "react";
import { getTranslations, readClientLocale } from "@/lib/locale";

export type ReportNavigationItem = { id: string; content: string; title: string; description: string };

export function ReportNavigation({ items, selected }: { items: ReportNavigationItem[]; selected: string[] }) {
  const t = getTranslations(readClientLocale()).management.reportsNavigation;
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
  const allSelected = items.every((item) => checkedContents.has(item.content));
  return <nav className="report-content-list" aria-label={t.ariaLabel}><header><span>{t.contentCount.replace("{selected}", String(checkedContents.size)).replace("{total}", String(items.length))}</span><button type="button" disabled={allSelected} onClick={() => setCheckedContents(new Set(items.map((item) => item.content)))}>{t.selectAll}</button></header>{items.map((item, index) => <div className={activeId === item.id ? "active" : ""} key={item.id}><label title={t.selectTitle.replace("{title}", item.title)}><input form="report-scope-form" type="checkbox" name="content" value={item.content} checked={checkedContents.has(item.content)} onChange={(event) => toggle(item.content, event.target.checked)}/><span className="sr-only">{t.selectTitle.replace("{title}", item.title)}</span></label><button type="button" aria-current={activeId === item.id ? "location" : undefined} onClick={() => goTo(item.id)}><span className="report-nav-index">{String(index + 1).padStart(2, "0")}</span><span><strong>{item.title}</strong><small>{item.description}</small></span></button></div>)}</nav>;
}
