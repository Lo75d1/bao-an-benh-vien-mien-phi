/* eslint-disable @next/next/no-img-element -- public evidence URL comes from configured storage */
import Image from "next/image";
import type { CSSProperties } from "react";
import { Clock3, ImageOff, LogIn, MessageSquareText, Utensils } from "lucide-react";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getSessionUser } from "@/lib/auth";
import { blendHex, readBrandingSettings, readableForeground } from "@/lib/branding";
import { readPublicDietMenu } from "@/lib/patient-note";
import { readPublicViewStats } from "@/lib/public-page-views";
import { PublicViewTracker } from "@/components/public-view-tracker";
import { submitPublicPatientNoteAction } from "@/app/patient-note-actions";
import { getTranslations } from "@/lib/locale";
import { readLocale } from "@/lib/locale-server";
import { PublicLanguageSwitcher } from "@/components/language-switcher";
import { hrefWithLocale } from "@/lib/locale-url";

const DEMO_ACCOUNTS = process.env.DEMO_LOGIN_BUTTONS === "1"
  ? [
      { label: "Quản trị / Trưởng khoa", email: "admin@demo.local", password: "Demo-Admin-2026!" },
      { label: "Dinh dưỡng", email: "dietitian@demo.local", password: "Demo-Dietitian-2026!" },
      { label: "Điều dưỡng", email: "nurse@demo.local", password: "Demo-Nurse-2026!" },
      { label: "Nhà bếp", email: "kitchen@demo.local", password: "Demo-Kitchen-2026!" },
    ]
  : [];

const dateLabel = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  weekday: "long",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const numberFormat = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });

const ROLE_GUIDE_IMAGES = {
  patient: "/demo/role-guides/patient.jpg",
  nurse: "/demo/role-guides/nurse.jpg",
  dietitian: "/demo/role-guides/dietitian.jpg",
  kitchen: "/demo/role-guides/kitchen.jpg",
  admin: "/demo/role-guides/admin.jpg",
} as const;

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ diet?: string; date?: string; patient?: string; note?: string }>;
}) {
  const query = await searchParams;
  const demoMode = process.env.DEMO_MODE === "1";
  const locale = await readLocale();
  const t = getTranslations(locale).public;
  const [user, branding, menu, views] = await Promise.all([
    getSessionUser(),
    readBrandingSettings(),
    readPublicDietMenu(query.diet, query.date),
    readPublicViewStats(),
  ]);
  if (demoMode && query.patient !== "1") redirect("/demo");
  if (user && !(demoMode && query.patient === "1")) {
    redirect({ ADMIN: "/quan-ly", DIETITIAN: "/quan-ly", NURSE: "/bao-suat", KITCHEN: "/bep" }[user.role]);
  }

  const publicForeground = readableForeground(branding.publicPrimaryColor);
  const publicStyle = {
    "--public-primary": branding.publicPrimaryColor,
    "--public-accent": branding.publicAccentColor,
    "--public-primary-foreground": publicForeground,
    "--primary": branding.publicPrimaryColor,
    "--primary-foreground": publicForeground,
    "--accent": branding.publicAccentColor,
    "--accent-foreground": readableForeground(branding.publicAccentColor),
    "--ring": branding.publicAccentColor,
    "--brand-surface": branding.publicPrimaryColor,
    "--brand-foreground": publicForeground,
    "--secondary": blendHex(branding.publicPrimaryColor, "#FFFFFF", 0.9),
  } as CSSProperties;
  const publicHeroImage = branding.publicHeroImageDataUrl ?? "/demo-hospital-meal-hero.png";
  const heroStyle = branding.publicHeroEnabled
    ? { backgroundImage: `linear-gradient(90deg,rgba(248,251,253,.97) 0%,rgba(248,251,253,.91) 45%,rgba(248,251,253,.12) 100%),url("${publicHeroImage}")` }
    : undefined;
  const hrefForLocale = (nextLocale: "vi" | "en") => {
    const params = new URLSearchParams();
    if (query.diet) params.set("diet", query.diet);
    if (query.date) params.set("date", query.date);
    if (query.patient) params.set("patient", query.patient);
    const nextQuery = params.toString();
    return hrefWithLocale(nextQuery ? `/?${nextQuery}` : "/", nextLocale);
  };
  const localeHrefs = { vi: hrefForLocale("vi"), en: hrefForLocale("en") };
  const roleGuides = (["patient", "nurse", "dietitian", "kitchen", "admin"] as const).map((role) => ({
    role,
    image: ROLE_GUIDE_IMAGES[role],
    title: t.roleGallery.roles[role].title,
    description: t.roleGallery.roles[role].description,
    alt: t.roleGallery.roles[role].alt,
    href: role === "patient" ? "#public-menu-browser" : null,
  }));

  return (
    <main className="public-menu-home" style={publicStyle}>
      <PublicViewTracker />
      <header className="public-menu-header">
        <a href="#public-menu-browser" className="public-menu-brand">
          {branding.logoDataUrl ? (
            <Image src={branding.logoDataUrl} alt={`Logo ${branding.organizationName}`} width={40} height={40} unoptimized />
          ) : (
            <span>{branding.shortName}</span>
          )}
          <strong>{branding.organizationName}</strong>
        </a>
        <div className="public-header-actions">
          <PublicLanguageSwitcher current={locale} hrefs={localeHrefs} />
          <Dialog>
            <DialogTrigger asChild>
              <button type="button" className="staff-login-trigger">
                <LogIn aria-hidden="true" />
                {t.staffLogin}
              </button>
            </DialogTrigger>
            <DialogContent className="max-h-[92vh] max-w-md overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t.staffLoginTitle}</DialogTitle>
                <DialogDescription>{t.staffLoginDescription}</DialogDescription>
              </DialogHeader>
              <LoginForm demoAccounts={DEMO_ACCOUNTS} locale={locale} />
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <section
        className={branding.publicHeroEnabled ? "public-menu-hero public-menu-hero-compact has-public-hero" : "public-menu-hero public-menu-hero-compact"}
        style={heroStyle}
        id="public-menu-browser"
        aria-labelledby="public-menu-title"
      >
        <div className="public-menu-copy">
          <p className="eyebrow">{t.patientMenu}</p>
          <h1 id="public-menu-title">{t.title}</h1>
          <p>{t.intro}</p>
        </div>
        <form method="get" className="public-menu-filter">
          {demoMode ? <input type="hidden" name="patient" value="1" /> : null}
          <label>
            {t.dietCode}
            <select name="diet" defaultValue={menu.selectedDiet?.code ?? ""}>
              {menu.diets.map((diet) => (
                <option key={diet.id} value={diet.code}>
                  {diet.code} · {diet.name}
                  {diet.feedingRoute === "SONDE" ? ` · ${t.tubeFeeding}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t.viewDate}
            <input type="date" name="date" min={menu.minDate} max={menu.maxDate} defaultValue={menu.selectedDate} />
          </label>
          <button type="submit">{t.viewMenu}</button>
          <small>{t.previewLimit.replace("{days}", String(menu.advanceEntryDays))}</small>
        </form>
      </section>

      <section className="public-meal-timeline" aria-label={t.mealTimeline}>
        <article>
          <Clock3 aria-hidden="true" />
          <div>
            <span>{t.currentMeal}</span>
            {menu.currentMeal ? (
              <>
                <strong>
                  {menu.currentMeal.mealType.name} · {menu.currentMeal.mealType.serviceTime}
                </strong>
                <small>{menu.currentMeal.dishes.length ? menu.currentMeal.dishes.join(" · ") : `— · ${t.noDishName}`}</small>
              </>
            ) : (
              <>
                <strong>—</strong>
                <small>{t.beforeFirstMeal}</small>
              </>
            )}
          </div>
        </article>
        <article className="is-next">
          <Clock3 aria-hidden="true" />
          <div>
            <span>{t.nextMeal}</span>
            {menu.nextMeal ? (
              <>
                <strong>
                  {menu.nextMeal.mealType.name} · {menu.nextMeal.mealType.serviceTime}
                </strong>
                <small>
                  {dateLabel.format(menu.nextMeal.mealDate)} · {menu.nextMeal.dishes.length ? menu.nextMeal.dishes.join(" · ") : t.noDishName}
                </small>
              </>
            ) : (
              <>
                <strong>—</strong>
                <small>{t.noNextMenu}</small>
              </>
            )}
          </div>
        </article>
      </section>

      <section className="public-role-gallery" aria-labelledby="public-role-gallery-title">
        <header>
          <p className="eyebrow">{t.roleGallery.eyebrow}</p>
          <h2 id="public-role-gallery-title">{t.roleGallery.title}</h2>
          <p>{t.roleGallery.description}</p>
        </header>
        <div className="public-role-gallery-scroll" role="list">
          {roleGuides.map((guide) => (
            <article className="public-role-card" key={guide.role} role="listitem">
              <Dialog>
                <DialogTrigger asChild>
                  <button type="button" className="public-role-image-button" aria-label={t.roleGallery.openPreview.replace("{role}", guide.title)}>
                    <Image src={guide.image} alt={guide.alt} width={1024} height={1280} sizes="(max-width: 760px) 82vw, (max-width: 1100px) 42vw, 320px" />
                  </button>
                </DialogTrigger>
                <DialogContent className="public-role-preview-dialog max-h-[92vh] max-w-4xl overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{guide.title}</DialogTitle>
                    <DialogDescription>{guide.description}</DialogDescription>
                  </DialogHeader>
                  <Image src={guide.image} alt={guide.alt} width={1024} height={1280} sizes="(max-width: 900px) 92vw, 760px" />
                </DialogContent>
              </Dialog>
              <div>
                <h3>{guide.title}</h3>
                <p>{guide.description}</p>
                {guide.href ? <a href={guide.href}>{t.roleGallery.openRole}</a> : null}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="public-menu-results" aria-labelledby="public-menu-result-title">
        <header>
          <div>
            <p className="eyebrow">{t.savedMenu}</p>
            <h2 id="public-menu-result-title">
              {menu.selectedDiet ? `${menu.selectedDiet.code} · ${menu.selectedDiet.name}` : t.noDietCode}
            </h2>
          </div>
          <time dateTime={menu.selectedDate}>{dateLabel.format(new Date(`${menu.selectedDate}T00:00:00.000Z`))}</time>
        </header>
        {!menu.meals.length ? (
          <div className="public-menu-empty">
            <Utensils aria-hidden="true" />
            <strong>{t.noMenuTitle}</strong>
            <span>{t.noMenuHelp}</span>
          </div>
        ) : (
          <div className="public-menu-meal-list">
            {menu.meals.map((meal) => (
              <article key={meal.id}>
                {menu.showImages ? (
                  meal.evidence[0]?.publicUrl ? (
                    <figure className="public-menu-photo-frame">
                      <img src={meal.evidence[0].publicUrl} alt={t.mealPhoto.replace("{meal}", meal.mealType.name).replace("{diet}", menu.selectedDiet?.name ?? t.noDietCode)} />
                      {meal.evidence[0].demoBot ? <figcaption>{t.demoMealPhoto}</figcaption> : null}
                    </figure>
                  ) : (
                    <div className="public-menu-photo-empty">
                      <ImageOff aria-hidden="true" />
                      <span>{t.noPhoto}</span>
                    </div>
                  )
                ) : null}
                <div>
                  <span>{meal.mealType.serviceTime}</span>
                  <h3>{meal.mealType.name}</h3>
                  {meal.dishes.length ? (
                    <div className="public-dish-list">
                      {meal.dishes.map((dish) => (
                        <section key={dish}>
                          <h4>{dish}</h4>
                          <ul>
                            {meal.ingredients
                              .filter((item) => item.dishName === dish)
                              .map((item, index) => (
                                <li key={`${item.name}-${index}`}>
                                  <span>{item.name}</span>
                                  <strong>{item.grams === null ? "—" : `${numberFormat.format(item.grams)} g`}</strong>
                                </li>
                              ))}
                          </ul>
                        </section>
                      ))}
                    </div>
                  ) : (
                    <small>{t.noDishData}</small>
                  )}
                  {meal.patientVisibleNote ? (
                    <aside className="public-patient-note">
                      <strong>{t.dietitianNote}</strong>
                      <p>{meal.patientVisibleNote}</p>
                    </aside>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      <section className="public-patient-feedback" id="gui-ghi-chu" aria-labelledby="public-note-title">
        <div className="public-patient-feedback-copy">
          <MessageSquareText aria-hidden="true" />
          <div>
            <p className="eyebrow">{t.sendToDepartment}</p>
            <h2 id="public-note-title">{t.feedbackKitchenNote}</h2>
            <p>{t.feedbackHelp}</p>
          </div>
        </div>
        {query.note === "sent" ? <p className="patient-form-success" role="status">{t.sentFeedback}</p> : null}
        {query.note && query.note !== "sent" ? (
          <p className="patient-form-error" role="alert">
            {query.note === "limited" ? t.limited : query.note === "invalid" ? t.invalid : query.note === "invalidAttachment" ? t.invalidAttachment : t.unavailable}
          </p>
        ) : null}
        {menu.departments.length ? (
          <form action={submitPublicPatientNoteAction} encType="multipart/form-data">
            <input type="hidden" name="returnDiet" value={menu.selectedDiet?.code ?? ""} />
            <input type="hidden" name="returnDate" value={menu.selectedDate} />
            <label>
              {t.department}
              <select name="departmentToken" required defaultValue="">
                <option value="" disabled>
                  {t.chooseDepartment}
                </option>
                {menu.departments.map((department) => (
                  <option key={department.id} value={department.token}>
                    {department.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t.content} <span>{t.required}</span>
              <textarea
                name="note"
                minLength={3}
                maxLength={500}
                required
                placeholder={t.contentPlaceholder}
              />
            </label>
            <label>
              {t.senderName} <span>{t.optional}</span>
              <input name="contactName" maxLength={100} autoComplete="off" />
            </label>
            <label>
              {t.attachment} <span>{t.optional}</span>
              <input name="attachment" type="file" accept="image/jpeg,image/png,image/webp" />
              <small>{t.attachmentHelp}</small>
            </label>
            <button type="submit">{t.submit}</button>
          </form>
        ) : (
          <p className="public-note-unavailable">{t.noteUnavailable}</p>
        )}
      </section>
      <footer className="public-menu-footer">
        <span>{t.footer}</span>
        {menu.showViewCount ? <span>{t.views.replace("{count}", new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-US").format(views.total))}</span> : null}
      </footer>
    </main>
  );
}
