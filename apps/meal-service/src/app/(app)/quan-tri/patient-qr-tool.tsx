"use client";

/* eslint-disable @next/next/no-img-element -- QR preview is a generated data URL */
import QRCode from "qrcode";
import { useEffect, useMemo, useState } from "react";

type DepartmentOption = { id: string; name: string; token: string };

function buildUrl(baseUrl: string, token: string) {
  try {
    const url = new URL(`/k/${encodeURIComponent(token)}`, baseUrl);
    return url.toString();
  } catch {
    return "";
  }
}

export function PatientQrTool({ publicBaseUrl, departments }: { publicBaseUrl: string; departments: DepartmentOption[] }) {
  const [departmentId, setDepartmentId] = useState(departments[0]?.id ?? "");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const selectedDepartment = departments.find((item) => item.id === departmentId) ?? departments[0] ?? null;
  const targetUrl = useMemo(() => selectedDepartment && publicBaseUrl ? buildUrl(publicBaseUrl, selectedDepartment.token) : "", [publicBaseUrl, selectedDepartment]);

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

  return <section id="patient-qr" className="admin-panel patient-qr-tool"><div className="section-heading"><div><p className="eyebrow">Trang công khai</p><h2>Tạo mã QR cho bệnh nhân/người nhà</h2></div><span>QR theo khoa</span></div>
    {!publicBaseUrl ? <p className="patient-form-error" role="alert">Chưa cấu hình Public URL bệnh viện. Hãy nhập URL ở phần Cài đặt vận hành trước khi tạo QR.</p> : null}
    {publicBaseUrl && departments.length ? <div className="patient-qr-grid">
      <label>Khoa điều trị<select value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label>
      <div className="patient-qr-preview" aria-live="polite">{qrDataUrl && targetUrl ? <img src={qrDataUrl} alt={`QR trang công khai ${selectedDepartment?.name ?? ""}`}/> : <span>Đang tạo QR…</span>}</div>
      <div className="patient-qr-actions"><label>URL đích<input readOnly value={targetUrl}/></label><button type="button" className="secondary-button" onClick={copyLink}>Copy link</button>{qrDataUrl && targetUrl ? <a className="primary-action" download={`qr-${selectedDepartment?.name ?? "khoa"}.png`} href={qrDataUrl}>Tải PNG</a> : null}<button type="button" className="secondary-button" onClick={printQr}>In</button><small>Production nên dùng HTTPS. QR không chứa secret, chỉ chứa public token của khoa.</small></div>
    </div> : null}
  </section>;
}
