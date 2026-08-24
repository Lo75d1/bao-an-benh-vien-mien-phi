"use client";

import { ImagePlus, Palette, RotateCcw } from "lucide-react";
import Image from "next/image";
import { startTransition, useMemo, useState, useTransition, type CSSProperties } from "react";
import type { BrandingSettings } from "@/lib/branding";

const PRESETS = ["#123C36", "#0F5E55", "#244A73", "#6A3D52", "#72572C"];
const previewForeground = (hex: string) => {
  const value = hex.replace("#", "");
  const rgb = [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16));
  return rgb[0] * .299 + rgb[1] * .587 + rgb[2] * .114 > 155 ? "#17241F" : "#FFFFFF";
};

export function BrandingForm({ branding, action }: { branding: BrandingSettings; action: (data: FormData) => Promise<void> }) {
  const [pending, run] = useTransition();
  const [name, setName] = useState(branding.organizationName);
  const [shortName, setShortName] = useState(branding.shortName);
  const [color, setColor] = useState(branding.primaryColor);
  const [logo, setLogo] = useState<string | null>(branding.logoDataUrl);
  const previewStyle = useMemo(() => ({ "--preview-brand": color, "--preview-foreground": previewForeground(color) } as CSSProperties), [color]);

  function submit(formData: FormData) { startTransition(() => run(() => action(formData))); }
  function previewFile(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => setLogo(typeof reader.result === "string" ? reader.result : null));
    reader.readAsDataURL(file);
  }

  return <form action={submit} className="branding-settings-form">
    <div className="branding-editor">
      <div className="branding-fields">
        <label>Tên bệnh viện hoặc dự án<input name="organizationName" value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={100} required/></label>
        <label>Tên viết tắt<input name="shortName" value={shortName} onChange={(event) => setShortName(event.target.value.toUpperCase())} maxLength={5} pattern="[A-Za-zÀ-ỹ0-9]{1,5}" required/></label>
        <fieldset><legend>Màu chủ đạo</legend><div className="brand-color-row"><input aria-label="Chọn màu chủ đạo" name="primaryColor" type="color" value={color} onChange={(event) => setColor(event.target.value.toUpperCase())}/><input aria-label="Mã màu chủ đạo" value={color} onChange={(event) => setColor(event.target.value.toUpperCase())} pattern="#[0-9A-Fa-f]{6}"/></div><div className="brand-presets" aria-label="Màu gợi ý">{PRESETS.map((preset) => <button key={preset} type="button" aria-label={`Dùng màu ${preset}`} aria-pressed={color === preset} style={{ backgroundColor: preset }} onClick={() => setColor(preset)}/>)}</div></fieldset>
        <label className="brand-logo-field"><span>Logo <small>PNG, JPG hoặc WebP · tối đa 300 KB</small></span><span className="brand-file-button"><ImagePlus aria-hidden="true"/>Chọn ảnh<input name="logo" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => previewFile(event.target.files?.[0])}/></span></label>
        {branding.logoDataUrl ? <label className="brand-remove-logo"><input name="removeLogo" type="checkbox" onChange={(event) => event.target.checked && setLogo(null)}/><span>Xóa logo đang dùng</span></label> : null}
      </div>
      <aside className="brand-preview" style={previewStyle}><p><Palette aria-hidden="true"/>Xem trước header</p><div><span className="brand-preview-mark">{logo ? <Image src={logo} alt="Logo xem trước" width={34} height={34} unoptimized/> : shortName || "—"}</span><strong>{name || "Tên bệnh viện"}</strong><nav><i>Điều hành</i><i className="active">Quản trị</i></nav><b>AD</b></div><small>Màu chữ trên header được hệ thống tự chọn để giữ độ tương phản.</small></aside>
    </div>
    <footer className="branding-submit"><label>Lý do thay đổi<input name="reason" minLength={3} maxLength={500} placeholder="Ví dụ: Cập nhật nhận diện bệnh viện" required/></label><button type="reset" className="secondary-button" onClick={() => { setName(branding.organizationName); setShortName(branding.shortName); setColor(branding.primaryColor); setLogo(branding.logoDataUrl); }}><RotateCcw aria-hidden="true"/>Hủy thay đổi</button><button className="primary-action" disabled={pending}>{pending ? "Đang lưu…" : "Lưu nhận diện"}</button></footer>
  </form>;
}
