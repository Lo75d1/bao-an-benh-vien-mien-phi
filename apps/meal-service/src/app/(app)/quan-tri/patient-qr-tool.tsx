"use client";

/* eslint-disable @next/next/no-img-element -- QR preview is a generated data URL */
import QRCode from "qrcode";
import { useEffect, useMemo, useState } from "react";
import { buildDepartmentQrUrl, normalizeQrTargetUrl } from "@/lib/patient-qr";

type DepartmentOption = { id: string; name: string; token: string };

export function PatientQrTool({ publicBaseUrl, departments }: { publicBaseUrl: string; departments: DepartmentOption[] }) {
  const [mode, setMode] = useState<"DEPARTMENT" | "CUSTOM">("DEPARTMENT");
  const [departmentId, setDepartmentId] = useState(departments[0]?.id ?? "");
  const [customUrl, setCustomUrl] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const selectedDepartment = departments.find((item) => item.id === departmentId) ?? departments[0] ?? null;
  const customTargetUrl = useMemo(() => normalizeQrTargetUrl(customUrl), [customUrl]);
  const departmentTargetUrl = useMemo(() => selectedDepartment && publicBaseUrl ? buildDepartmentQrUrl(publicBaseUrl, selectedDepartment.token) : "", [publicBaseUrl, selectedDepartment]);
  const targetUrl = mode === "CUSTOM" ? customTargetUrl : departmentTargetUrl;
  const customUrlInvalid = mode === "CUSTOM" && customUrl.trim().length > 0 && !customTargetUrl;

  useEffect(() => {
    let cancelled = false;
    if (!targetUrl) return;
    QRCode.toDataURL(targetUrl, { width: 320, margin: 2, errorCorrectionLevel: "M" }).then((value) => {
      if (!cancelled) setQrDataUrl(value);
    }).catch(() => {
      if (!cancelled) setQrDataUrl("");
    });
    return () => { cancelled = true; };
  }, [targetUrl]);

  async function copyLink() {
    if (!targetUrl) return;
    await navigator.clipboard?.writeText(targetUrl);
  }

  function printQr() {
    window.print();
  }

  return <section id="patient-qr" className="admin-panel patient-qr-tool"><div className="section-heading"><div><p className="eyebrow">Trang công khai</p><h2>Tạo mã QR cho bệnh nhân/người nhà</h2></div><span>QR theo khoa hoặc dán link</span></div>
    <fieldset className="patient-qr-mode"><legend>Chọn kiểu tạo QR</legend><label><input type="radio" name="qrMode" value="DEPARTMENT" checked={mode === "DEPARTMENT"} onChange={() => { setQrDataUrl(""); setMode("DEPARTMENT"); }}/>Theo khoa</label><label><input type="radio" name="qrMode" value="CUSTOM" checked={mode === "CUSTOM"} onChange={() => { setQrDataUrl(""); setMode("CUSTOM"); }}/>Dán link</label></fieldset>
    {mode === "DEPARTMENT" && !publicBaseUrl ? <p className="patient-form-error" role="alert">Chưa cấu hình Public URL bệnh viện. Hãy nhập URL ở phần Cài đặt vận hành hoặc chuyển sang “Dán link”.</p> : null}
    {mode === "DEPARTMENT" && publicBaseUrl && !departments.length ? <p className="patient-form-error" role="alert">Chưa có khoa đang hoạt động để tạo QR theo khoa.</p> : null}
    <div className="patient-qr-grid">
      <div className="patient-qr-inputs">
        {mode === "DEPARTMENT" ? <label>Khoa điều trị<select value={departmentId} onChange={(event) => { setQrDataUrl(""); setDepartmentId(event.target.value); }} disabled={!publicBaseUrl || !departments.length}>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label> : <label>Dán link tạo QR<input value={customUrl} onChange={(event) => { setQrDataUrl(""); setCustomUrl(event.target.value); }} inputMode="url" placeholder="https://ten-benh-vien.example/trang-cong-khai"/></label>}
        {customUrlInvalid ? <p className="patient-form-error" role="alert">Link phải là URL http/https hợp lệ.</p> : null}
      </div>
      <div className="patient-qr-preview" aria-live="polite">{qrDataUrl && targetUrl ? <img src={qrDataUrl} alt={mode === "CUSTOM" ? "QR từ link đã dán" : `QR trang công khai ${selectedDepartment?.name ?? ""}`}/> : <span>{mode === "CUSTOM" && !customUrl.trim() ? "Dán link để tạo QR." : targetUrl ? "Đang tạo QR…" : "Chưa có URL hợp lệ."}</span>}</div>
      <div className="patient-qr-actions"><label>URL đích<input readOnly value={targetUrl}/></label><button type="button" className="secondary-button" onClick={copyLink} disabled={!targetUrl}>Copy link</button>{qrDataUrl && targetUrl ? <a className="primary-action" download={mode === "CUSTOM" ? "qr-link.png" : `qr-${selectedDepartment?.name ?? "khoa"}.png`} href={qrDataUrl}>Tải PNG</a> : null}<button type="button" className="secondary-button" onClick={printQr} disabled={!targetUrl}>In</button><small>Production nên dùng HTTPS. QR theo khoa chỉ chứa public token của khoa; QR dán link sẽ dùng đúng link Admin nhập.</small></div>
    </div>
  </section>;
}
