"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { getTranslations, readClientLocale } from "@/lib/locale";
import type { ReportSection } from "@/lib/reports";

type ReportColumn = { key: string; label: string };

export function ReportTable({ columns: source, rows }: { columns: ReportColumn[]; rows: Record<string, unknown>[] }) {
  const t = getTranslations(readClientLocale()).management.reportsTable;
  const columns: ColumnDef<Record<string, unknown>, unknown>[] = source.map((column) => ({ accessorKey: column.key, header: column.label, cell: ({ getValue }) => { const value = getValue(); return value === null || value === undefined || value === "" ? t.missing : String(value); }, meta: { numeric: /quantity|total|price|amount|count/i.test(column.key) } }));
  return <DataTable columns={columns} data={rows} filterPlaceholder={t.filterPlaceholder} emptyMessage={t.emptyMessage} pageSize={15}/>;
}

export function ReportPreview({ sections }: { sections: ReportSection[] }) {
  const t = getTranslations(readClientLocale()).management.reportsTable;
  const sectionId = (title: string) => `report-${title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
  return <div className="report-preview-sections">{sections.map((section) => <section id={sectionId(section.title)} key={section.title}><header><div><span>{t.sectionEyebrow}</span><h3>{section.title}</h3></div><b>{t.rowCount.replace("{count}", String(section.rows.length))}</b></header><ReportTable columns={section.columns} rows={section.rows}/></section>)}</div>;
}
