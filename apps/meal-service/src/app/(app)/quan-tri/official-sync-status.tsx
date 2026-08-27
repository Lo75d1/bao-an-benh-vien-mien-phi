"use client";

import { useEffect } from "react";
import { Download, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";

type Sample = { code?: string; name?: string; energyKcal?: number | null };
type SyncJob = {
  id: string;
  source: "VDD_FOOD" | "VDD_DISH" | "RNI_DISH";
  status: "PREVIEW" | "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED";
  processedCount: number;
  createdCount: number;
  updatedCount: number;
  errorMessage: string | null;
  total: number | null;
  samples: Sample[];
};

const SOURCE_LABEL = { VDD_FOOD: "Thực phẩm VDD", VDD_DISH: "Món ăn VDD", RNI_DISH: "Món dùng sẵn / RNI" } as const;
const STATUS_LABEL = { PREVIEW: "Đang xem trước", QUEUED: "Đang chờ xử lý", RUNNING: "Đang cập nhật", COMPLETED: "Đã hoàn tất", FAILED: "Cập nhật lỗi" } as const;

export function OfficialSyncStatus({ job }: { job: SyncJob | null }) {
  const router = useRouter();
  const running = job?.status === "QUEUED" || job?.status === "RUNNING";
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => router.refresh(), 2_000);
    return () => window.clearInterval(timer);
  }, [router, running]);
  if (!job || job.status === "PREVIEW") return null;
  const progress = job.total && job.total > 0 ? Math.min(100, Math.round(job.processedCount / job.total * 100)) : null;
  return <section className={`official-sync-status is-${job.status.toLowerCase()}`} aria-live="polite">
    <div className="official-sync-status-heading">
      <span className="official-sync-icon">{running ? <LoaderCircle className="spin" aria-hidden="true"/> : job.status === "COMPLETED" ? "✓" : "!"}</span>
      <div><strong>{STATUS_LABEL[job.status]} · {SOURCE_LABEL[job.source]}</strong><p>{job.processedCount.toLocaleString("vi-VN")}{job.total ? ` / ${job.total.toLocaleString("vi-VN")}` : ""} bản ghi đã xử lý</p></div>
      <span className="official-sync-percent">{progress === null ? "—" : `${progress}%`}</span>
    </div>
    <div className="official-sync-progress" aria-label="Tiến trình cập nhật"><span style={{ width: `${progress ?? 0}%` }}/></div>
    {job.status === "COMPLETED" ? <div className="official-sync-summary"><span>Tạo mới <strong>{job.createdCount.toLocaleString("vi-VN")}</strong></span><span>Cập nhật <strong>{job.updatedCount.toLocaleString("vi-VN")}</strong></span></div> : null}
    {job.errorMessage ? <p className="official-sync-error">{job.errorMessage}</p> : null}
    <div className="official-sync-actions">
      <details><summary>Xem dữ liệu</summary>{job.samples.length ? <table><thead><tr><th>Mã</th><th>Tên</th><th>kcal/100g</th></tr></thead><tbody>{job.samples.map((sample, index) => <tr key={`${sample.code ?? "row"}-${index}`}><td>{sample.code || "—"}</td><td>{sample.name || "—"}</td><td>{sample.energyKcal ?? "—"}</td></tr>)}</tbody></table> : <p>Chưa có mẫu dữ liệu để hiển thị.</p>}</details>
      <a className="secondary-button" href={`/quan-tri/du-lieu/xuat?source=${job.source}`}><Download aria-hidden="true"/>Tải dữ liệu CSV</a>
    </div>
  </section>;
}
