"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { DietCriterion } from "@suat-an/nutrition-engine";
import { EvaluationBadge } from "@/components/presentation";

export function DietEvaluation({ criteria }: { criteria: DietCriterion[] }) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  return <section className="evaluation-panel" aria-labelledby="evaluation-title">
    <div className="panel-title"><div><p className="eyebrow">Đánh giá chỉ tiêu</p><h2 id="evaluation-title">So với mã chế độ</h2></div><span className="evaluation-hint">Bấm từng dòng để xem số liệu</span></div>
    <div className="evaluation-list">{criteria.map((criterion) => <button type="button" className={`evaluation-row evaluation-${criterion.status.toLowerCase()}`} key={criterion.key} onClick={() => setOpen((value) => ({ ...value, [criterion.key]: !value[criterion.key] }))} aria-expanded={Boolean(open[criterion.key])}>
      <span className="criterion-main">{open[criterion.key] ? <ChevronDown aria-hidden="true"/> : <ChevronRight aria-hidden="true"/>}<strong>{criterion.label}</strong><EvaluationBadge status={criterion.status}/></span>
      {open[criterion.key] && <span className="criterion-detail"><span>Thực tế <strong className="tabular">{criterion.actual === null ? "—" : `${criterion.actual.toLocaleString("vi-VN", { maximumFractionDigits: 2 })} ${criterion.unit}`}</strong></span><span>Mục tiêu <strong className="tabular">{criterion.target || "—"}</strong></span>{criterion.status === "MISSING" && <em>Thiếu dữ liệu dinh dưỡng hoặc ngưỡng; hệ thống không ước đoán.</em>}</span>}
    </button>)}</div>
  </section>;
}
