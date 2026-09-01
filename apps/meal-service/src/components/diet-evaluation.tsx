"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { DietCriterion } from "@suat-an/nutrition-engine";
import { EvaluationBadge } from "@/components/presentation";
import type { Language } from "@/lib/i18n";

export function DietEvaluation({ criteria, language = "vi" }: { criteria: DietCriterion[]; language?: Language }) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  return <section className="evaluation-panel" aria-labelledby="evaluation-title">
    <div className="panel-title"><div><p className="eyebrow">{language === "en" ? "Nutrient assessment" : "Đánh giá chỉ tiêu"}</p><h2 id="evaluation-title">{language === "en" ? "Compared with diet code" : "So với mã chế độ"}</h2></div><span className="evaluation-hint">{language === "en" ? "Select a row to view values" : "Bấm từng dòng để xem số liệu"}</span></div>
    <div className="evaluation-list">{criteria.map((criterion) => <button type="button" className={`evaluation-row evaluation-${criterion.status.toLowerCase()}`} key={criterion.key} onClick={() => setOpen((value) => ({ ...value, [criterion.key]: !value[criterion.key] }))} aria-expanded={Boolean(open[criterion.key])}>
      <span className="criterion-main">{open[criterion.key] ? <ChevronDown aria-hidden="true"/> : <ChevronRight aria-hidden="true"/>}<strong>{criterion.label}</strong><EvaluationBadge status={criterion.status} language={language}/></span>
      {open[criterion.key] && <span className="criterion-detail"><span>{language === "en" ? "Actual" : "Thực tế"} <strong className="tabular">{criterion.actual === null ? "—" : `${criterion.actual.toLocaleString(language === "en" ? "en-US" : "vi-VN", { maximumFractionDigits: 2 })} ${criterion.unit}`}</strong></span><span>{language === "en" ? "Target" : "Mục tiêu"} <strong className="tabular">{criterion.target || "—"}</strong></span>{criterion.status === "MISSING" && <em>{language === "en" ? "Nutrient data or thresholds are missing; the system does not estimate values." : "Thiếu dữ liệu dinh dưỡng hoặc ngưỡng; hệ thống không ước đoán."}</em>}</span>}
    </button>)}</div>
  </section>;
}
