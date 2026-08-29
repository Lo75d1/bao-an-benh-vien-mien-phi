"use client";

import { Check, ImagePlus, RotateCcw } from "lucide-react";
import Image from "next/image";
import { startTransition, useState, useTransition, type CSSProperties } from "react";
import { publicThemeTokens, type BrandingSettings } from "@/lib/branding";

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
  const [publicPrimary, setPublicPrimary] = useState(branding.publicPrimaryColor);
  const [publicAccent, setPublicAccent] = useState(branding.publicAccentColor);
  const [heroEnabled, setHeroEnabled] = useState(branding.publicHeroEnabled);
  const [heroImage, setHeroImage] = useState<string | null>(branding.publicHeroImageDataUrl);
  const previewColors = publicThemeTokens(publicPrimary, publicAccent);

  function submit(formData: FormData) { startTransition(() => run(() => action(formData))); }
  function previewFile(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => setLogo(typeof reader.result === "string" ? reader.result : null));
    reader.readAsDataURL(file);
  }
  function previewHero(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => setHeroImage(typeof reader.result === "string" ? reader.result : null));
    reader.readAsDataURL(file);
  }
  function reset() { setName(branding.organizationName); setShortName(branding.shortName); setColor(branding.primaryColor); setLogo(branding.logoDataUrl); setPublicPrimary(branding.publicPrimaryColor); setPublicAccent(branding.publicAccentColor); setHeroEnabled(branding.publicHeroEnabled); setHeroImage(branding.publicHeroImageDataUrl); }

  return <form action={submit} className="branding-direct-settings">
    <section className="brand-direct-identity" aria-labelledby="brand-identity-title">
      <div className="brand-logo-control"><div className="brand-current-logo">{logo ? <Image src={logo} alt="Logo đang chọn" width={72} height={72} unoptimized/> : <strong>{shortName || "—"}</strong>}</div><label className="brand-upload-button"><ImagePlus aria-hidden="true"/><span>Đổi logo<small>PNG, JPG, WebP · tối đa 300 KB</small></span><input name="logo" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => previewFile(event.target.files?.[0])}/></label>{branding.logoDataUrl ? <label className="brand-remove-logo"><input name="removeLogo" type="checkbox" onChange={(event) => event.target.checked && setLogo(null)}/><span>Xóa logo</span></label> : null}</div>
      <div className="brand-identity-copy"><h3 id="brand-identity-title">Tên hiển thị</h3><p>Thay đổi tại đây sẽ dùng chung cho đăng nhập và thanh đầu trang.</p><div className="brand-name-fields"><label>Tên bệnh viện<input name="organizationName" value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={100} required/></label><label>Tên ngắn<input name="shortName" value={shortName} onChange={(event) => setShortName(event.target.value.toUpperCase())} maxLength={5} pattern="[A-Za-zÀ-ỹ0-9]{1,5}" required/></label></div></div>
    </section>

    <section className="brand-direct-colors" aria-labelledby="brand-color-title"><div><h3 id="brand-color-title">Màu hệ thống</h3><p>Chọn một màu sáng. Hệ thống tự làm đậm chữ và nút để dễ nhìn.</p></div><div className="brand-choice-list">{PRESETS.map((preset) => <button key={preset.value} type="button" aria-pressed={color === preset.value} onClick={() => setColor(preset.value)}><i style={{ backgroundColor: preset.value }}/><span>{preset.label}</span>{color === preset.value ? <Check aria-hidden="true"/> : null}</button>)}<label className="brand-custom-color"><input name="primaryColor" type="color" value={color} onChange={(event) => setColor(event.target.value.toUpperCase())}/><span>Màu khác</span></label></div></section>

    <section className="brand-public-home" aria-labelledby="public-home-title">
      <div className="brand-public-controls"><div><h3 id="public-home-title">Trang chủ công khai</h3><p>Chỉ áp dụng cho trang bệnh nhân; không đổi màu màn hình làm việc.</p></div><div className="brand-public-color-row"><label>Màu chính<input name="publicPrimaryColor" type="color" value={publicPrimary} onChange={(event) => setPublicPrimary(event.target.value.toUpperCase())}/><span>{publicPrimary}</span></label><label>Màu nhấn<input name="publicAccentColor" type="color" value={publicAccent} onChange={(event) => setPublicAccent(event.target.value.toUpperCase())}/><span>{publicAccent}</span></label></div><label className="brand-hero-toggle"><input name="publicHeroEnabled" type="checkbox" checked={heroEnabled} onChange={(event) => setHeroEnabled(event.target.checked)}/><span>Hiện ảnh nền trang chủ</span></label><label className="brand-upload-button"><ImagePlus aria-hidden="true"/><span>Đổi ảnh nền<small>JPG, WebP · tối đa 1,5 MB</small></span><input name="publicHeroImage" type="file" accept="image/jpeg,image/webp" onChange={(event) => previewHero(event.target.files?.[0])}/></label>{branding.publicHeroImageDataUrl ? <label className="brand-remove-hero"><input name="removePublicHeroImage" type="checkbox" onChange={(event) => event.target.checked && setHeroImage(null)}/><span>Dùng lại ảnh mặc định</span></label> : null}</div>
      <div className={heroEnabled ? "brand-public-preview has-image" : "brand-public-preview"} style={{ "--preview-primary": publicPrimary, "--preview-primary-foreground": previewColors.primaryForeground, "--preview-accent": previewColors.heroAccentText, "--preview-hero-primary": previewColors.heroPrimaryText, backgroundImage: heroEnabled ? `linear-gradient(90deg,rgba(248,251,253,.97),rgba(248,251,253,.2)),url("${heroImage ?? "/hospital-meal-hero.png"}")` : undefined } as CSSProperties}><header><b>{shortName || "BV"}</b><strong>{name || "Tên bệnh viện"}</strong></header><div><span>Thực đơn dành cho người bệnh</span><h4>Xem thực đơn theo chế độ ăn</h4><button type="button">Xem thực đơn</button></div></div>
    </section>

    <footer className="branding-direct-submit"><label>Lý do thay đổi<input name="reason" minLength={3} maxLength={500} placeholder="Ví dụ: Cập nhật tên bệnh viện" required/></label><button type="reset" className="secondary-button" onClick={reset}><RotateCcw aria-hidden="true"/>Đặt lại</button><button className="primary-action" disabled={pending}>{pending ? "Đang lưu…" : "Lưu thay đổi"}</button></footer>
  </form>;
}
