import { Separator } from "@/components/ui/separator";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSessionUser } from "@/lib/auth";
import { PageHeader } from "@/components/presentation";
import { FileDown, FileSpreadsheet, Printer, ShieldCheck } from "lucide-react";
import { getTranslations } from "@/lib/locale";
import { readLocale } from "@/lib/locale-server";
import { parseReportContent, parseReportRange, readReportBundle } from "@/lib/reports";
import { clampDateToDataStart, readOperationalSettings } from "@/lib/settings";
import { ReportPreview } from "./report-table";
import { ReportNavigation, type ReportNavigationItem } from "./report-navigation";

const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => `${today().slice(0, 8)}01`;

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; content?: string | string[]; preview?: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/");
  const locale = await readLocale();
  const t = getTranslations(locale).management.reportsPage;
  const [params, settings] = await Promise.all([searchParams, readOperationalSettings()]);
  const fromValue = clampDateToDataStart(params.from ?? monthStart(), settings.dataStartDate);
  const toValue = clampDateToDataStart(params.to ?? today(), settings.dataStartDate);
  const defaultContents = user.role === "NURSE" ? ["servings", "additions", "menus", "evidence"] : ["servings", "additions", "menus", "evidence", "warehouse"];
  const requestedContents = params.content ? (Array.isArray(params.content) ? params.content : [params.content]) : defaultContents;
  const parsedContents = requestedContents.map((content) => parseReportContent(content));
  const selectedContents = parsedContents.includes("full") ? defaultContents.map((content) => parseReportContent(content)) : parsedContents.filter((item) => item !== "full");
  const preview = params.preview === "1" && selectedContents.length ? await readReportBundle(selectedContents, parseReportRange(fromValue, toValue < fromValue ? fromValue : toValue), user, locale) : null;
  const sections = preview?.sections ?? (preview ? [{ title: preview.title, columns: preview.columns, rows: preview.rows }] : []);
  const rowCount = sections.reduce((sum, section) => sum + section.rows.length, 0);
  const navigation: ReportNavigationItem[] = [
    { id: "report-bao-suat-theo-khoa", content: "servings", title: t.navigationServingsTitle, description: t.navigationServingsDescription },
    { id: "report-suat-bo-sung", content: "additions", title: t.navigationAdditionsTitle, description: t.navigationAdditionsDescription },
    { id: "report-thuc-don-va-dinh-duong", content: "menus", title: t.navigationMenusTitle, description: t.navigationMenusDescription },
    { id: "report-bang-chung-bep", content: "evidence", title: t.navigationEvidenceTitle, description: t.navigationEvidenceDescription },
    ...(user.role !== "NURSE" ? [{ id: "report-nhap-xuat-va-dieu-chinh-kho", content: "warehouse", title: t.navigationWarehouseTitle, description: t.navigationWarehouseDescription }] : []),
  ];
  const scopeLabel = user.role === "NURSE" ? t.nurseScope : t.hospitalScope;
  return <AppShell user={user} locale={locale}><main className="workspace report-page report-workbench"><Separator className="page-separator" aria-hidden="true"/>
    <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description} actions={<p className="scope-note">{scopeLabel}</p>}/>
    <form id="report-scope-form" action="/bao-cao/xuat" method="get" target="_blank" className="report-scope-bar">
      <div><span>{t.scopeLabel}</span><strong>{scopeLabel}</strong></div>
      <label><span>{t.fromDate}</span><input type="date" name="from" min={settings.dataStartDate} defaultValue={fromValue} required/></label>
      <label><span>{t.toDate}</span><input type="date" name="to" min={settings.dataStartDate} defaultValue={toValue < fromValue ? fromValue : toValue} required/></label>
      <div className="report-selection-summary"><span>{t.contentLabel}</span><strong>{t.contentHint}</strong></div>
      <button className="secondary-button" type="submit" name="preview" value="1" formTarget="_self" formAction="/bao-cao">{t.preview}</button>
      <button className="primary-action" type="submit" name="format" value="excel"><FileSpreadsheet aria-hidden="true"/>{t.exportExcel}</button>
      <button className="secondary-button" type="submit" name="format" value="pdf"><FileDown aria-hidden="true"/>PDF</button>
      <button className="report-print-action" type="submit" name="format" value="print"><Printer aria-hidden="true"/><span>{t.print}</span></button>
    </form>
    <div className="report-work-grid"><aside className="report-content-panel" aria-labelledby="report-builder-title"><header><span><ShieldCheck aria-hidden="true"/></span><div><h2 id="report-builder-title">{t.builderTitle}</h2><p>{t.builderDescription}</p></div></header>
      <ReportNavigation items={navigation} selected={selectedContents}/>
      <p className="report-footnote">{t.footnote}</p>
    </aside><section className="report-preview-panel" aria-labelledby="report-preview-title">{preview ? <><header className="report-preview-head"><div><span>{t.previewEyebrow}</span><h2 id="report-preview-title">{preview.title}</h2><p>{t.previewRange.replace("{scope}", preview.scope).replace("{from}", preview.from).replace("{to}", preview.to)}</p></div><dl><div><dt>{t.groupCount}</dt><dd>{sections.length}</dd></div><div><dt>{t.totalRows}</dt><dd>{rowCount || "—"}</dd></div><div><dt>{t.warning}</dt><dd>{rowCount ? "—" : t.missingData}</dd></div></dl></header><ReportPreview sections={sections}/></> : <div className="split-placeholder"><FileDown aria-hidden="true"/><h2 id="report-preview-title">{t.placeholderTitle}</h2><p>{t.placeholderDescription}</p><span>{t.defaultBundle}{user.role !== "NURSE" ? t.warehouseBundleSuffix : ""}</span></div>}</section></div>
  </main></AppShell>;
}
