/* eslint-disable @next/next/no-img-element -- public evidence URL comes from configured storage */
import Image from "next/image";
import type { CSSProperties } from "react";
import {
  Clock3,
  ImageOff,
  LogIn,
  MessageSquareText,
  Utensils,
} from "lucide-react";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getSessionUser } from "@/lib/auth";
import {
  blendHex,
  publicThemeTokens,
  readBrandingSettings,
} from "@/lib/branding";
import { publicDishSummaries, readPublicDietMenu } from "@/lib/patient-note";
import { getTranslations, normalizeLanguage } from "@/lib/i18n";
import { readPublicViewStats } from "@/lib/public-page-views";
import { PublicViewTracker } from "@/components/public-view-tracker";
import { PublicLanguageSwitcher } from "@/components/language-switcher";
import { submitPublicPatientNoteAction } from "@/app/patient-note-actions";
import { readSetupCompletion } from "@/lib/first-time-setup";

export const dynamic = "force-dynamic";

const numberFormat = new Intl.NumberFormat("vi-VN", {
  maximumFractionDigits: 1,
});

function PublicDishList({
  dishNames,
  ingredients,
  showIngredients,
  ingredientsLabel,
}: {
  dishNames: string[];
  ingredients: Array<{ dishName: string; name: string; grams: number | null }>;
  showIngredients: boolean;
  ingredientsLabel: string;
}) {
  const dishes = publicDishSummaries(dishNames, ingredients);
  return (
    <div className="public-dish-list">
      {dishes.map((dish) => (
        <section key={dish.name}>
          <h4>
            <span>{dish.name}</span>
            <strong>
              {dish.totalGrams === null
                ? "—"
                : `${numberFormat.format(dish.totalGrams)} g`}
            </strong>
          </h4>
          {showIngredients ? (
            <details>
              <summary>{ingredientsLabel}</summary>
              <ul>
                {ingredients
                  .filter((item) => item.dishName === dish.name)
                  .map((item, index) => (
                    <li key={`${item.name}-${index}`}>
                      <span>{item.name}</span>
                      <strong>
                        {item.grams === null
                          ? "—"
                          : `${numberFormat.format(item.grams)} g`}
                      </strong>
                    </li>
                  ))}
              </ul>
            </details>
          ) : null}
        </section>
      ))}
    </div>
  );
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{
    diet?: string;
    date?: string;
    patient?: string;
    note?: string;
    lang?: string;
  }>;
}) {
  if (!(await readSetupCompletion())) redirect("/thiet-lap-ban-dau");
  const query = await searchParams;
  const language = normalizeLanguage(query.lang);
  const t = getTranslations(language);
  const [user, branding, menu, views] = await Promise.all([
    getSessionUser({ allowPasswordChange: true }),
    readBrandingSettings(),
    readPublicDietMenu(query.diet, query.date),
    readPublicViewStats(),
  ]);
  if (user) {
    if (user.mustChangePassword) redirect("/ho-so?first=1");
    redirect(
      {
        ADMIN: "/quan-ly",
        DIETITIAN: "/quan-ly",
        NURSE: "/bao-suat",
        KITCHEN: "/bep",
      }[user.role],
    );
  }

  const colors = publicThemeTokens(
    branding.publicPrimaryColor,
    branding.publicAccentColor,
  );
  const publicStyle = {
    "--public-primary": branding.publicPrimaryColor,
    "--public-accent": branding.publicAccentColor,
    "--public-primary-foreground": colors.primaryForeground,
    "--public-accent-foreground": colors.accentForeground,
    "--public-primary-text": colors.heroPrimaryText,
    "--public-accent-text": colors.heroAccentText,
    "--public-hero-foreground": colors.heroForeground,
    "--public-hero-primary-text": colors.heroPrimaryText,
    "--public-hero-accent-text": colors.heroAccentText,
    "--public-border": colors.border,
    "--primary": branding.publicPrimaryColor,
    "--primary-foreground": colors.primaryForeground,
    "--accent": branding.publicAccentColor,
    "--accent-foreground": colors.accentForeground,
    "--border": colors.border,
    "--input": colors.border,
    "--ring": branding.publicAccentColor,
    "--brand-surface": branding.publicPrimaryColor,
    "--brand-foreground": colors.primaryForeground,
    "--secondary": blendHex(branding.publicPrimaryColor, "#FFFFFF", 0.9),
  } as CSSProperties;
  const dateLabel = new Intl.DateTimeFormat(
    language === "en" ? "en-US" : "vi-VN",
    {
      timeZone: "Asia/Ho_Chi_Minh",
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  );
  const publicHeroImage =
    branding.publicHeroImageDataUrl ?? "/hospital-meal-hero.png";
  const heroStyle = branding.publicHeroEnabled
    ? {
        backgroundImage: `linear-gradient(90deg,rgba(248,251,253,.97) 0%,rgba(248,251,253,.91) 45%,rgba(248,251,253,.12) 100%),url("${publicHeroImage}")`,
      }
    : undefined;
  const languageHref = (nextLanguage: "vi" | "en") => {
    const params = new URLSearchParams();
    if (query.patient) params.set("patient", query.patient);
    if (query.diet) params.set("diet", query.diet);
    if (query.date) params.set("date", query.date);
    params.set("lang", nextLanguage);
    return `?${params.toString()}`;
  };

  return (
    <main className="public-menu-home" style={publicStyle}>
      <PublicViewTracker />
      <header className="public-menu-header">
        <a href="#public-menu-browser" className="public-menu-brand">
          {branding.logoDataUrl ? (
            <Image
              src={branding.logoDataUrl}
              alt={`Logo ${branding.organizationName}`}
              width={40}
              height={40}
              unoptimized
            />
          ) : (
            <span>{branding.shortName}</span>
          )}
          <strong>{branding.organizationName}</strong>
        </a>
        <PublicLanguageSwitcher current={language} hrefFor={languageHref} />
        <Dialog>
          <DialogTrigger asChild>
            <button type="button" className="staff-login-trigger">
              <LogIn aria-hidden="true" />
              {t.public.staffLogin}
            </button>
          </DialogTrigger>
          <DialogContent className="max-h-[92vh] max-w-md overflow-y-auto">
            <DialogHeader>
                <DialogTitle>{t.public.staffLoginTitle}</DialogTitle>
              <DialogDescription>
                {t.public.staffLoginDescription}
              </DialogDescription>
            </DialogHeader>
              <LoginForm language={language} />
          </DialogContent>
        </Dialog>
      </header>

      <section
        className={
          branding.publicHeroEnabled
            ? "public-menu-hero public-menu-hero-compact has-public-hero"
            : "public-menu-hero public-menu-hero-compact"
        }
        style={heroStyle}
        id="public-menu-browser"
        aria-labelledby="public-menu-title"
      >
        <div className="public-menu-copy">
            <p className="eyebrow">{t.public.patientMenu}</p>
            <h1 id="public-menu-title">{t.public.title}</h1>
          <p>
            {t.public.intro}
          </p>
        </div>
        <form method="get" className="public-menu-filter">
          <label>
              {t.public.dietCode}
            <select name="diet" defaultValue={menu.selectedDiet?.code ?? ""}>
              {menu.diets.map((diet) => (
                <option key={diet.id} value={diet.code}>
                  {diet.code} · {diet.name}
                  {diet.feedingRoute === "SONDE" ? ` · ${t.public.tubeFeeding}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label>
              {t.public.viewDate}
            <input
              type="date"
              name="date"
              min={menu.minDate}
              max={menu.maxDate}
              defaultValue={menu.selectedDate}
            />
          </label>
            <button type="submit">{t.public.viewMenu}</button>
          <small>
            {t.public.previewLimit.replace("{days}", String(menu.advanceEntryDays))}
          </small>
        </form>
      </section>

      <section
        className="public-meal-timeline"
        aria-label={t.public.mealTimeline}
      >
        <article>
          <Clock3 aria-hidden="true" />
          <div>
            <span>{t.public.currentMeal}</span>
            {menu.currentMeal ? (
              <>
                <strong>
                  {menu.currentMeal.mealType.name} ·{" "}
                  {menu.currentMeal.mealType.serviceTime}
                </strong>
                <small>
                  {menu.showDishes
                    ? menu.currentMeal.dishes.length
                      ? menu.currentMeal.dishes.join(" · ")
                      : `— · ${t.public.noDishName}`
                    : t.public.dishesHidden}
                </small>
              </>
            ) : (
              <>
                <strong>—</strong>
                <small>{t.public.beforeFirstMeal}</small>
              </>
            )}
          </div>
        </article>
        <article className="is-next">
          <Clock3 aria-hidden="true" />
          <div>
            <span>{t.public.nextMeal}</span>
            {menu.nextMeal ? (
              <>
                <strong>
                  {menu.nextMeal.mealType.name} ·{" "}
                  {menu.nextMeal.mealType.serviceTime}
                </strong>
                <small>
                  {dateLabel.format(menu.nextMeal.mealDate)} ·{" "}
                  {menu.showDishes
                    ? menu.nextMeal.dishes.length
                      ? menu.nextMeal.dishes.join(" · ")
                      : t.public.noDishName
                    : t.public.dishesHidden}
                </small>
              </>
            ) : (
              <>
                <strong>—</strong>
                <small>{t.public.noNextMenu}</small>
              </>
            )}
          </div>
        </article>
      </section>

      <section
        className="public-menu-results"
        aria-labelledby="public-menu-result-title"
      >
        <header>
          <div>
            <p className="eyebrow">{t.public.savedMenu}</p>
            <h2 id="public-menu-result-title">
              {menu.selectedDiet
                ? `${menu.selectedDiet.code} · ${menu.selectedDiet.name}`
                : t.public.noDietCode}
            </h2>
          </div>
          <time dateTime={menu.selectedDate}>
            {dateLabel.format(new Date(`${menu.selectedDate}T00:00:00.000Z`))}
          </time>
        </header>
        {!menu.meals.length ? (
          <div className="public-menu-empty">
            <Utensils aria-hidden="true" />
            <strong>{t.public.noMenuTitle}</strong>
            <span>{t.public.noMenuHelp}</span>
          </div>
        ) : (
          <div className="public-menu-meal-list">
            {menu.meals.map((meal) => (
              <article key={meal.id}>
                {menu.showImages ? (
                  meal.evidence[0]?.publicUrl ? (
                    <img
                      src={meal.evidence[0].publicUrl}
                      alt={t.public.mealPhoto.replace("{meal}", meal.mealType.name).replace("{diet}", menu.selectedDiet?.name ?? t.public.dietCode)}
                    />
                  ) : (
                    <div className="public-menu-photo-empty">
                      <ImageOff aria-hidden="true" />
                      <span>{t.public.noPhoto}</span>
                    </div>
                  )
                ) : null}
                <div>
                  <span>{meal.mealType.serviceTime}</span>
                  <h3>{meal.mealType.name}</h3>
                  {menu.showDishes ? (
                    meal.dishes.length ? (
                      <PublicDishList
                        dishNames={meal.dishes}
                        ingredients={meal.ingredients}
                        showIngredients={menu.showIngredients}
                        ingredientsLabel={t.public.ingredients}
                      />
                    ) : (
                      <small>{t.public.noDishData}</small>
                    )
                  ) : null}
                  {meal.patientVisibleNote ? (
                    <aside className="public-patient-note">
                      <strong>{t.public.dietitianNote}</strong>
                      <p>{meal.patientVisibleNote}</p>
                    </aside>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      <section
        className="public-patient-feedback"
        id="gui-ghi-chu"
        aria-labelledby="public-note-title"
      >
        <div className="public-patient-feedback-copy">
          <MessageSquareText aria-hidden="true" />
          <div>
            <p className="eyebrow">{t.public.sendToDepartment}</p>
            <h2 id="public-note-title">{t.public.feedbackKitchenNote}</h2>
            <p>{t.public.feedbackHelp}</p>
          </div>
        </div>
        {query.note === "sent-feedback" ? (
          <p className="patient-form-success" role="status">
            {t.public.sentFeedback}
          </p>
        ) : null}
        {query.note === "sent-kitchen" ? (
          <p className="patient-form-success" role="status">
            {t.public.sentKitchenNote}
          </p>
        ) : null}
        {query.note && !query.note.startsWith("sent") ? (
          <p className="patient-form-error" role="alert">
            {query.note === "limited"
              ? t.public.limited
              : query.note === "invalid"
                ? t.public.invalid
                : t.public.unavailable}
          </p>
        ) : null}
        {menu.departments.length ? (
          <form
            action={submitPublicPatientNoteAction}
            encType="multipart/form-data"
          >
            <input
              type="hidden"
              name="returnDiet"
              value={menu.selectedDiet?.code ?? ""}
            />
            <input type="hidden" name="returnDate" value={menu.selectedDate} />
            <input type="hidden" name="returnLang" value={language} />
            <fieldset className="public-submission-type">
              <legend>{t.public.content}</legend>
              <label className="public-submission-type-option">
                <input
                  type="radio"
                  name="type"
                  value="FEEDBACK"
                  defaultChecked
                />
                <span>{t.public.feedback}</span>
              </label>
              <label className="public-submission-type-option">
                <input type="radio" name="type" value="KITCHEN_NOTE" />
                <span>{t.public.kitchenNote}</span>
              </label>
            </fieldset>
            <label>
              {t.public.department}
              <select name="departmentToken" required defaultValue="">
                <option value="" disabled>
                  {t.public.chooseDepartment}
                </option>
                {menu.departments.map((department) => (
                  <option key={department.id} value={department.token}>
                    {department.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t.public.content} <span>{t.public.required}</span>
              <textarea
                name="note"
                minLength={3}
                maxLength={500}
                required
                placeholder={t.public.contentPlaceholder}
              />
            </label>
            <label>
              {t.public.senderName} <span>{t.public.optional}</span>
              <input name="contactName" maxLength={100} autoComplete="off" />
            </label>
            <label>
              {t.public.contactInfo} <span>{t.public.optional}</span>
              <input name="contactInfo" maxLength={120} autoComplete="off" />
            </label>
            <label>
              {t.public.attachment} <span>{t.public.optional}</span>
              <input
                name="attachment"
                type="file"
                accept="image/jpeg,image/png,image/webp"
              />
            </label>
            <button type="submit">{t.public.submit}</button>
          </form>
        ) : (
          <p className="public-note-unavailable">{t.public.noteUnavailable}</p>
        )}
      </section>
      <footer className="public-menu-footer">
        <span>{t.public.footer}</span>
        {menu.showViewCount ? (
          <span>
            {t.public.views.replace("{count}", new Intl.NumberFormat(language === "en" ? "en-US" : "vi-VN").format(views.total))}
          </span>
        ) : null}
      </footer>
    </main>
  );
}
