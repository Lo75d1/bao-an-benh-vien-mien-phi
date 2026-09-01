"use client";

import { useEffect } from "react";
import { Download, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { getTranslations, readClientLocale } from "@/lib/locale";

type Sample = { code?: string; name?: string; energyKcal?: number | null };
type SyncJob = { id: string; source: "VDD_FOOD" | "VDD_DISH" | "RNI_DISH"; status: "PREVIEW" | "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED"; processedCount: number; createdCount: number; updatedCount: number; errorMessage: string | null; total: number | null; samples: Sample[] };

export function OfficialSyncStatus({ job }: { job: SyncJob | null }) {
  const locale = readClientLocale();
  const t = getTranslations(locale).management.officialSync;
  const router = useRouter();
  const running = job?.status === "QUEUED" || job?.status === "RUNNING";
  useEffect(() => { if (!running) return; const timer = window.setInterval(() => router.refresh(), 2_000); return () => window.clearInterval(timer); }, [router, running]);
  if (!job || job.status === "PREVIEW") return null;
  const number = new Intl.NumberFormat(locale === "en" ? "en-US" : "vi-VN");
  const sourceLabel = t.source[job.source];
  const statusLabel = t.status[job.status];
  const progress = job.total && job.total > 0 ? Math.min(100, Math.round(job.processedCount / job.total * 100)) : null;
  return <section className={`official-sync-status is-${job.status.toLowerCase()}`} aria-live="polite">
    <div className="official-sync-status-heading"><span className="official-sync-icon">{running ? <LoaderCircle className="spin" aria-hidden="true"/> : job.status === "COMPLETED" ? "✓" : "!"}</span><div><strong>{statusLabel} · {sourceLabel}</strong><p>{t.processed.replace("{processed}", number.format(job.processedCount)).replace("{total}", job.total ? ` / ${number.format(job.total)}` : "")}</p></div><span className="official-sync-percent">{progress === null ? "-" : `${progress}%`}</span></div>
    <div className="official-sync-progress" aria-label={t.progressAria}><span style={{ width: `${progress ?? 0}%` }}/></div>
    {job.status === "COMPLETED" ? <div className="official-sync-summary"><span>{t.created} <strong>{number.format(job.createdCount)}</strong></span><span>{t.updated} <strong>{number.format(job.updatedCount)}</strong></span></div> : null}
    {job.errorMessage ? <p className="official-sync-error">{job.errorMessage}</p> : null}
    <div className="official-sync-actions"><details><summary>{t.viewData}</summary>{job.samples.length ? <table><thead><tr><th>{t.code}</th><th>{t.name}</th><th>kcal/100g</th></tr></thead><tbody>{job.samples.map((sample, index) => <tr key={`${sample.code ?? "row"}-${index}`}><td>{sample.code || "-"}</td><td>{sample.name || "-"}</td><td>{sample.energyKcal ?? "-"}</td></tr>)}</tbody></table> : <p>{t.noSamples}</p>}</details><a className="secondary-button" href={`/quan-tri/du-lieu/xuat?source=${job.source}`}><Download aria-hidden="true"/>{t.downloadCsv}</a></div>
  </section>;
}
