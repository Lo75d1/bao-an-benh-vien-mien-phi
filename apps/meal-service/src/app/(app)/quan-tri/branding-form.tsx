"use client";

import { Check, ImagePlus, RotateCcw } from "lucide-react";
import Image from "next/image";
import { startTransition, useState, useTransition, type CSSProperties } from "react";
import type { BrandingSettings } from "@/lib/branding";
import { getTranslations, readClientLocale } from "@/lib/locale";

const PRESET_VALUES = ["#DDF1EA", "#E3F0FA", "#F4E9F0", "#F6EDDB", "#E8ECEA", "#123C36"] as const;

export function BrandingForm({ branding, action }: { branding: BrandingSettings; action: (data: FormData) => Promise<void> }) {
  const t = getTranslations(readClientLocale()).management.brandingForm;
  const presets = PRESET_VALUES.map((value, index) => ({ value, label: t.presets[index] ?? value }));
  const [pending, run] = useTransition();
  const [name, setName] = useState(branding.organizationName);
  const [shortName, setShortName] = useState(branding.shortName);
  const [color, setColor] = useState(branding.primaryColor);
  const [logo, setLogo] = useState<string | null>(branding.logoDataUrl);
  const [publicPrimary, setPublicPrimary] = useState(branding.publicPrimaryColor);
  const [publicAccent, setPublicAccent] = useState(branding.publicAccentColor);
  const [heroEnabled, setHeroEnabled] = useState(branding.publicHeroEnabled);
  const [heroImage, setHeroImage] = useState<string | null>(branding.publicHeroImageDataUrl);

  function submit(formData: FormData) { startTransition(() => run(() => action(formData))); }
  function previewFile(file?: File) { if (!file) return; const reader = new FileReader(); reader.addEventListener("load", () => setLogo(typeof reader.result === "string" ? reader.result : null)); reader.readAsDataURL(file); }
  function previewHero(file?: File) { if (!file) return; const reader = new FileReader(); reader.addEventListener("load", () => setHeroImage(typeof reader.result === "string" ? reader.result : null)); reader.readAsDataURL(file); }
  function reset() { setName(branding.organizationName); setShortName(branding.shortName); setColor(branding.primaryColor); setLogo(branding.logoDataUrl); setPublicPrimary(branding.publicPrimaryColor); setPublicAccent(branding.publicAccentColor); setHeroEnabled(branding.publicHeroEnabled); setHeroImage(branding.publicHeroImageDataUrl); }

  return <form action={submit} className="branding-direct-settings">
    <section className="brand-direct-identity" aria-labelledby="brand-identity-title">
      <div className="brand-logo-control"><div className="brand-current-logo">{logo ? <Image src={logo} alt={t.selectedLogoAlt} width={72} height={72} unoptimized/> : <strong>{shortName || "-"}</strong>}</div><label className="brand-upload-button"><ImagePlus aria-hidden="true"/><span>{t.changeLogo}<small>{t.logoHint}</small></span><input name="logo" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => previewFile(event.target.files?.[0])}/></label>{branding.logoDataUrl ? <label className="brand-remove-logo"><input name="removeLogo" type="checkbox" onChange={(event) => event.target.checked && setLogo(null)}/><span>{t.removeLogo}</span></label> : null}</div>
      <div className="brand-identity-copy"><h3 id="brand-identity-title">{t.displayNameTitle}</h3><p>{t.displayNameHelp}</p><div className="brand-name-fields"><label>{t.organizationName}<input name="organizationName" value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={100} required/></label><label>{t.shortName}<input name="shortName" value={shortName} onChange={(event) => setShortName(event.target.value.toUpperCase())} maxLength={5} pattern="[A-Za-zÀ-ỹ0-9]{1,5}" required/></label></div></div>
    </section>
    <section className="brand-direct-colors" aria-labelledby="brand-color-title"><div><h3 id="brand-color-title">{t.systemColorTitle}</h3><p>{t.systemColorHelp}</p></div><div className="brand-choice-list">{presets.map((preset) => <button key={preset.value} type="button" aria-pressed={color === preset.value} onClick={() => setColor(preset.value)}><i style={{ backgroundColor: preset.value }}/><span>{preset.label}</span>{color === preset.value ? <Check aria-hidden="true"/> : null}</button>)}<label className="brand-custom-color"><input name="primaryColor" type="color" value={color} onChange={(event) => setColor(event.target.value.toUpperCase())}/><span>{t.customColor}</span></label></div></section>
    <section className="brand-public-home" aria-labelledby="public-home-title">
      <div className="brand-public-controls"><div><h3 id="public-home-title">{t.publicHomeTitle}</h3><p>{t.publicHomeHelp}</p></div><div className="brand-public-color-row"><label>{t.primaryColor}<input name="publicPrimaryColor" type="color" value={publicPrimary} onChange={(event) => setPublicPrimary(event.target.value.toUpperCase())}/><span>{publicPrimary}</span></label><label>{t.accentColor}<input name="publicAccentColor" type="color" value={publicAccent} onChange={(event) => setPublicAccent(event.target.value.toUpperCase())}/><span>{publicAccent}</span></label></div><label className="brand-hero-toggle"><input name="publicHeroEnabled" type="checkbox" checked={heroEnabled} onChange={(event) => setHeroEnabled(event.target.checked)}/><span>{t.showHero}</span></label><label className="brand-upload-button"><ImagePlus aria-hidden="true"/><span>{t.changeHero}<small>{t.heroHint}</small></span><input name="publicHeroImage" type="file" accept="image/jpeg,image/webp" onChange={(event) => previewHero(event.target.files?.[0])}/></label>{branding.publicHeroImageDataUrl ? <label className="brand-remove-hero"><input name="removePublicHeroImage" type="checkbox" onChange={(event) => event.target.checked && setHeroImage(null)}/><span>{t.restoreDefaultHero}</span></label> : null}</div>
      <div className={heroEnabled ? "brand-public-preview has-image" : "brand-public-preview"} style={{ "--preview-primary": publicPrimary, "--preview-accent": publicAccent, backgroundImage: heroEnabled ? `linear-gradient(90deg,rgba(248,251,253,.97),rgba(248,251,253,.2)),url("${heroImage ?? "/demo-hospital-meal-hero.png"}")` : undefined } as CSSProperties}><header><b>{shortName || t.previewShortName}</b><strong>{name || t.previewHospital}</strong></header><div><span>{t.previewEyebrow}</span><h4>{t.previewTitle}</h4><button type="button">{t.previewButton}</button></div></div>
    </section>
    <footer className="branding-direct-submit"><label>{t.changeReason}<input name="reason" minLength={3} maxLength={500} placeholder={t.reasonPlaceholder} required/></label><button type="reset" className="secondary-button" onClick={reset}><RotateCcw aria-hidden="true"/>{t.reset}</button><button className="primary-action" disabled={pending}>{pending ? t.saving : t.saveChanges}</button></footer>
  </form>;
}
