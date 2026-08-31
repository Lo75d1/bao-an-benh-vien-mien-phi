/* eslint-disable @next/next/no-img-element -- public evidence URL comes from configured storage */
import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { Clock3, ImageOff, LogIn, MessageSquareText, Utensils } from "lucide-react";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { PublicViewTracker } from "@/components/public-view-tracker";
import { DemoEntry } from "@/components/demo-entry";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { submitPublicPatientNoteAction } from "@/app/patient-note-actions";
import { getSessionUser } from "@/lib/auth";
import { blendHex, readBrandingSettings, readableForeground } from "@/lib/branding";
import { publicDateFormatter, publicMealTypeName, publicNumberFormatter, publicT, resolvePublicLanguage, type PublicLanguage } from "@/lib/public-i18n";
import { readPublicDietMenu } from "@/lib/patient-note";
import { readPublicViewStats } from "@/lib/public-page-views";

const DEMO_ACCOUNTS = process.env.DEMO_LOGIN_BUTTONS === "1" ? [
  { label: "Quản trị / Trưởng khoa", email: "admin@demo.local", password: "Demo-Admin-2026!" },
  { label: "Dinh dưỡng", email: "dietitian@demo.local", password: "Demo-Dietitian-2026!" },
  { label: "Điều dưỡng", email: "nurse@demo.local", password: "Demo-Nurse-2026!" },
  { label: "Nhà bếp", email: "kitchen@demo.local", password: "Demo-Kitchen-2026!" },
] : [];

type HomeQuery = { diet?: string; date?: string; patient?: string; note?: string; lang?: string };

function languageHref(query: HomeQuery, language: PublicLanguage) {
  const params = new URLSearchParams();
  if (query.patient) params.set("patient", query.patient);
  if (query.diet) params.set("diet", query.diet);
  if (query.date) params.set("date", query.date);
  if (query.note) params.set("note", query.note);
  params.set("lang", language);
  return `/?${params.toString()}`;
}

export default async function HomePage({ searchParams }: { searchParams: Promise<HomeQuery> }) {
  const query = await searchParams;
  const language = resolvePublicLanguage(query.lang);
  const t = (key: Parameters<typeof publicT>[1], vars?: Record<string, string | number>) => publicT(language, key, vars);
  const dateLabel = publicDateFormatter(language);
  const numberFormat = publicNumberFormatter(language);
  const viewCountFormat = publicNumberFormatter(language, 0);
  const demoMode = process.env.DEMO_MODE === "1";
  const [user, branding, menu, views] = await Promise.all([getSessionUser(), readBrandingSettings(), readPublicDietMenu(query.diet, query.date), readPublicViewStats()]);
  if (demoMode && query.patient !== "1") redirect("/demo");
  if (user && !(demoMode && query.patient === "1")) redirect({ ADMIN: "/quan-ly", DIETITIAN: "/quan-ly", NURSE: "/bao-suat", KITCHEN: "/bep" }[user.role]);

  const publicForeground = readableForeground(branding.publicPrimaryColor);
  const publicStyle = { "--public-primary": branding.publicPrimaryColor, "--public-accent": branding.publicAccentColor, "--public-primary-foreground": publicForeground, "--primary": branding.publicPrimaryColor, "--primary-foreground": publicForeground, "--accent": branding.publicAccentColor, "--accent-foreground": readableForeground(branding.publicAccentColor), "--ring": branding.publicAccentColor, "--brand-surface": branding.publicPrimaryColor, "--brand-foreground": publicForeground, "--secondary": blendHex(branding.publicPrimaryColor, "#FFFFFF", .9) } as CSSProperties;
  const publicHeroImage = branding.publicHeroImageDataUrl ?? "/demo-hospital-meal-hero.png";
  const heroStyle = branding.publicHeroEnabled ? { backgroundImage: `linear-gradient(90deg,rgba(248,251,253,.97) 0%,rgba(248,251,253,.91) 45%,rgba(248,251,253,.12) 100%),url("${publicHeroImage}")` } : undefined;
  const hiddenCommonFields = <><input type="hidden" name="lang" value={language}/>{demoMode ? <input type="hidden" name="patient" value="1"/> : null}</>;

  return <main className="public-menu-home" style={publicStyle} lang={language}>
    <PublicViewTracker/>
    <header className="public-menu-header">
      <a href="#public-menu-browser" className="public-menu-brand">{branding.logoDataUrl ? <Image src={branding.logoDataUrl} alt={`Logo ${branding.organizationName}`} width={40} height={40} unoptimized/> : <span>{branding.shortName}</span>}<strong>{branding.organizationName}</strong></a>
      <nav className="public-menu-nav" aria-label={t("patientNav")}>{demoMode ? <><Link aria-current="page" href={`/?patient=1&lang=${language}`}>{t("patient")}</Link><DemoEntry accounts={[]} compactAccount={{ key: "nurse", label: t("nurse"), description: t("demoNurse") }}/><DemoEntry accounts={[]} compactAccount={{ key: "dietitian", label: t("dietitian"), description: t("demoDietitian") }}/><DemoEntry accounts={[]} compactAccount={{ key: "kitchen", label: t("kitchen"), description: t("demoKitchen") }}/><DemoEntry accounts={[]} compactAccount={{ key: "sonde", label: t("sonde"), description: t("demoSonde") }}/><DemoEntry accounts={[]} compactAccount={{ key: "admin", label: t("admin"), description: t("demoAdmin") }}/></> : <><a href="#public-menu-browser">{t("menu")}</a><a href="#public-meal-timeline">{t("meals")}</a><a href="#gui-ghi-chu">{t("noteFeedback")}</a></>}</nav>
      <div className="public-language-switch" aria-label={t("languageLabel")}><Link aria-current={language === "vi" ? "page" : undefined} href={languageHref(query, "vi")}>VI</Link><Link aria-current={language === "en" ? "page" : undefined} href={languageHref(query, "en")}>EN</Link></div>
      <Dialog><DialogTrigger asChild><button type="button" className="staff-login-trigger"><LogIn aria-hidden="true"/>{t("staffLogin")}</button></DialogTrigger><DialogContent className="max-h-[92vh] max-w-md overflow-y-auto"><DialogHeader><DialogTitle>{t("staffLoginTitle")}</DialogTitle><DialogDescription>{t("staffLoginDescription")}</DialogDescription></DialogHeader><LoginForm demoAccounts={DEMO_ACCOUNTS}/></DialogContent></Dialog>
    </header>

    <section className={branding.publicHeroEnabled ? "public-menu-hero public-menu-hero-compact has-public-hero" : "public-menu-hero public-menu-hero-compact"} style={heroStyle} id="public-menu-browser" aria-labelledby="public-menu-title">
      <div className="public-menu-copy"><p className="eyebrow">{t("publicMenuEyebrow")}</p><h1 id="public-menu-title">{t("publicMenuTitle")}</h1><p>{t("publicMenuDescription")}</p></div>
      <form method="get" className="public-menu-filter">{hiddenCommonFields}<label>{t("dietCode")}<select name="diet" defaultValue={menu.selectedDiet?.code ?? ""}>{menu.diets.map((diet) => <option key={diet.id} value={diet.code}>{diet.code} · {diet.name}{diet.feedingRoute === "SONDE" ? ` · ${t("byTube")}` : ""}</option>)}</select></label><label>{t("viewDate")}<input type="date" name="date" min={menu.minDate} max={menu.maxDate} defaultValue={menu.selectedDate}/></label><button type="submit">{t("viewMenu")}</button><small>{t("advanceWindow", { days: menu.advanceEntryDays })}</small></form>
    </section>

    <section className="public-meal-timeline" id="public-meal-timeline" aria-label={`${t("currentMeal")} / ${t("nextMeal")}`}>
      <article><Clock3 aria-hidden="true"/><div><span>{t("currentMeal")}</span>{menu.currentMeal ? <><strong>{publicMealTypeName(menu.currentMeal.mealType.name, language)} · {menu.currentMeal.mealType.serviceTime}</strong><small>{menu.currentMeal.dishes.length ? menu.currentMeal.dishes.join(" · ") : `— · ${t("noDishName")}`}</small></> : <><strong>—</strong><small>{t("noCurrentMeal")}</small></>}</div></article>
      <article className="is-next"><Clock3 aria-hidden="true"/><div><span>{t("nextMeal")}</span>{menu.nextMeal ? <><strong>{publicMealTypeName(menu.nextMeal.mealType.name, language)} · {menu.nextMeal.mealType.serviceTime}</strong><small>{dateLabel.format(menu.nextMeal.mealDate)} · {menu.nextMeal.dishes.length ? menu.nextMeal.dishes.join(" · ") : t("noDishName")}</small></> : <><strong>—</strong><small>{t("noNextMeal")}</small></>}</div></article>
    </section>

    <section className="public-menu-results" aria-labelledby="public-menu-result-title">
      <header><div><p className="eyebrow">{t("savedMenu")}</p><h2 id="public-menu-result-title">{menu.selectedDiet ? `${menu.selectedDiet.code} · ${menu.selectedDiet.name}` : t("noDietCode")}</h2></div><time dateTime={menu.selectedDate}>{dateLabel.format(new Date(`${menu.selectedDate}T00:00:00.000Z`))}</time></header>
      {!menu.meals.length ? <div className="public-menu-empty"><Utensils aria-hidden="true"/><strong>{t("noMenuTitle")}</strong><span>{t("noMenuDescription")}</span></div> : <div className="public-menu-meal-list">{menu.meals.map((meal) => <article key={meal.id}>{menu.showImages ? meal.evidence[0]?.publicUrl ? <img src={meal.evidence[0].publicUrl} alt={`${publicMealTypeName(meal.mealType.name, language)} · ${menu.selectedDiet?.name ?? t("dietCode")}`}/> : <div className="public-menu-photo-empty"><ImageOff aria-hidden="true"/><span>{t("noPhoto")}</span></div> : null}<div><span>{meal.mealType.serviceTime}</span><h3>{publicMealTypeName(meal.mealType.name, language)}</h3>{meal.dishes.length ? <div className="public-dish-list">{meal.dishes.map((dish) => <section key={dish}><h4>{dish}</h4><ul>{meal.ingredients.filter((item) => item.dishName === dish).map((item, index) => <li key={`${item.name}-${index}`}><span>{item.name}</span><strong>{item.grams === null ? "—" : `${numberFormat.format(item.grams)} g`}</strong></li>)}</ul></section>)}</div> : <small>{t("noDishData")}</small>}{meal.patientVisibleNote ? <aside className="public-patient-note"><strong>{t("dietitianNote")}</strong><p>{meal.patientVisibleNote}</p></aside> : null}</div></article>)}</div>}
    </section>

    <section className="public-patient-feedback" id="gui-ghi-chu" aria-labelledby="public-note-title">
      <div className="public-patient-feedback-copy"><MessageSquareText aria-hidden="true"/><div><p className="eyebrow">{t("sendToRecipients")}</p><h2 id="public-note-title">{t("sendNoteFeedback")}</h2><p>{t("noteFeedbackHelp")}</p></div></div>
      {query.note === "sent" ? <p className="patient-form-success" role="status">{t("submitted")}</p> : null}
      {query.note && query.note !== "sent" ? <p className="patient-form-error" role="alert">{query.note === "limited" ? t("rateLimited") : query.note === "invalid" ? t("invalidNote") : t("submitFailed")}</p> : null}
      {menu.departments.length ? <form action={submitPublicPatientNoteAction}><input type="hidden" name="returnDiet" value={menu.selectedDiet?.code ?? ""}/><input type="hidden" name="returnDate" value={menu.selectedDate}/><input type="hidden" name="mealDate" value={menu.selectedDate}/><input type="hidden" name="returnLang" value={language}/>{hiddenCommonFields}<fieldset className="patient-submission-type"><legend>{t("chooseSubmissionType")}</legend><label><input type="radio" name="type" value="MEAL_NOTE" defaultChecked/>{t("mealNote")}</label><label><input type="radio" name="type" value="FEEDBACK"/>{t("feedback")}</label></fieldset><label>{t("department")}<select name="departmentToken" required defaultValue=""><option value="" disabled>{t("chooseDepartment")}</option>{menu.departments.map((department) => <option key={department.id} value={department.token}>{department.name}</option>)}</select></label><label>{t("content")} <span>{t("required")}</span><textarea name="note" minLength={3} maxLength={500} required placeholder={t("notePlaceholder")}/></label><label>{t("senderName")} <span>{t("optional")}</span><input name="contactName" maxLength={100} autoComplete="name"/></label><label>{t("contactInfo")} <span>{t("optional")}</span><input name="contactInfo" maxLength={120} autoComplete="tel" placeholder={t("contactPlaceholder")}/></label><button type="submit">{t("submitContent")}</button></form> : <p className="public-note-unavailable">{t("noteUnavailable")}</p>}
    </section>
    <footer className="public-menu-footer"><span>{t("publicFooter")}</span>{menu.showViewCount ? <span>{t("views", { count: viewCountFormat.format(views.total) })}</span> : null}</footer>
  </main>;
}
