"use client";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import type { ReportSection } from "@/lib/reports";
import type { Language } from "@/lib/i18n";
type ReportColumn = { key: string; label: string };
export function ReportTable({ columns: source, rows, language = "vi" }: { columns: ReportColumn[]; rows: Record<string, unknown>[]; language?: Language }) {
 const columns: ColumnDef<Record<string, unknown>, unknown>[] = source.map((column) => ({ accessorKey: column.key, header: column.label, cell: ({ getValue }) => { const value = getValue(); return value === null || value === undefined || value === "" ? "—" : String(value); }, meta: { numeric: /quantity|total|price|amount|count/i.test(column.key) } }));
 return <DataTable columns={columns} data={rows} filterPlaceholder={language === "en" ? "Filter report…" : "Lọc nhanh báo cáo…"} emptyMessage={language === "en" ? "No data in the selected range." : "Chưa có dữ liệu trong khoảng đã chọn."} pageSize={15}/>;
}

export function ReportPreview({ sections, language = "vi" }: { sections: ReportSection[]; language?: Language }) {
 const sectionId = (title: string) => `report-${title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
 return <div className="report-preview-sections">{sections.map((section) => <section id={sectionId(section.title)} key={section.title}><header><div><span>{language === "en" ? "Report content" : "Nội dung báo cáo"}</span><h3>{section.title}</h3></div><b>{section.rows.length} {language === "en" ? "rows" : "dòng"}</b></header><ReportTable columns={section.columns} rows={section.rows} language={language}/></section>)}</div>;
}
