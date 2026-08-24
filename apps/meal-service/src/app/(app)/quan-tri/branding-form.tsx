"use client";

import { Check, ImagePlus, RotateCcw } from "lucide-react";
import Image from "next/image";
import { startTransition, useState, useTransition } from "react";
import type { BrandingSettings } from "@/lib/branding";

const PRESETS = [
  { value: "#DDF1EA", label: "Xanh bạc hà" },
  { value: "#E3F0FA", label: "Xanh dịu" },
  { value: "#F4E9F0", label: "Hồng phấn" },
  { value: "#F6EDDB", label: "Kem ấm" },
  { value: "#E8ECEA", label: "Xám sáng" },
  { value: "#123C36", label: "Xanh rêu" },
];

export function BrandingForm({ branding, action }: { branding: BrandingSettings; action: (data: FormData) => Promise<void> }) {
  const [pending, run] = useTransition();
  const [name, setName] = useState(branding.organizationName);
  const [shortName, setShortName] = useState(branding.shortName);
  const [color, setColor] = useState(branding.primaryColor);
  const [logo, setLogo] = useState<string | null>(branding.logoDataUrl);

  function submit(formData: FormData) { startTransition(() => run(() => action(formData))); }
  function previewFile(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => setLogo(typeof reader.result === "string" ? reader.result : null));
    reader.readAsDataURL(file);
  }
  function reset() { setName(branding.organizationName); setShortName(branding.shortName); setColor(branding.primaryColor); setLogo(branding.logoDataUrl); }

  return <form action={submit} className="branding-direct-settings">
    <section className="brand-direct-identity" aria-labelledby="brand-identity-title">
      <div className="brand-current-logo">{logo ? <Image src={logo} alt="Logo đang chọn" width={72} height={72} unoptimized/> : <strong>{shortName || "—"}</strong>}</div>
      <div><h3 id="brand-identity-title">Tên hiển thị</h3><p>Thay đổi tại đây sẽ dùng chung cho đăng nhập và thanh đầu trang.</p><div className="brand-name-fields"><label>Tên bệnh viện<input name="organizationName" value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={100} required/></label><label>Tên ngắn<input name="shortName" value={shortName} onChange={(event) => setShortName(event.target.value.toUpperCase())} maxLength={5} pattern="[A-Za-zÀ-ỹ0-9]{1,5}" required/></label></div></div>
      <label className="brand-upload-button"><ImagePlus aria-hidden="true"/><span>Đổi logo<small>PNG, JPG, WebP · tối đa 300 KB</small></span><input name="logo" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => previewFile(event.target.files?.[0])}/></label>
      {branding.logoDataUrl ? <label className="brand-remove-logo"><input name="removeLogo" type="checkbox" onChange={(event) => event.target.checked && setLogo(null)}/><span>Xóa logo</span></label> : null}
    </section>

    <section className="brand-direct-colors" aria-labelledby="brand-color-title"><div><h3 id="brand-color-title">Màu hệ thống</h3><p>Chọn một màu sáng. Hệ thống tự làm đậm chữ và nút để dễ nhìn.</p></div><div className="brand-choice-list">{PRESETS.map((preset) => <button key={preset.value} type="button" aria-pressed={color === preset.value} onClick={() => setColor(preset.value)}><i style={{ backgroundColor: preset.value }}/><span>{preset.label}</span>{color === preset.value ? <Check aria-hidden="true"/> : null}</button>)}<label className="brand-custom-color"><input name="primaryColor" type="color" value={color} onChange={(event) => setColor(event.target.value.toUpperCase())}/><span>Màu khác</span></label></div></section>

    <footer className="branding-direct-submit"><label>Lý do thay đổi<input name="reason" minLength={3} maxLength={500} placeholder="Ví dụ: Cập nhật tên bệnh viện" required/></label><button type="reset" className="secondary-button" onClick={reset}><RotateCcw aria-hidden="true"/>Đặt lại</button><button className="primary-action" disabled={pending}>{pending ? "Đang lưu…" : "Lưu thay đổi"}</button></footer>
  </form>;
}
