"use client";

import { useTransition } from "react";
import { LANGUAGE_LABEL, type Language } from "@/lib/i18n";
import { PROFILE_TEXT } from "./catalog";

export function LanguageForm({
  current,
  action,
}: {
  current: Language;
  action: (formData: FormData) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  const t = PROFILE_TEXT[current];
  return (
    <form className="grid gap-3" action={action}>
      <label className="grid gap-2 text-sm font-medium text-[#123c36]">
        {t.language}
        <select
          name="language"
          defaultValue={current}
          className="min-h-11 rounded-xl border border-[#123c36]/15 bg-white px-3"
          onChange={(event) => {
            const form = event.currentTarget.form;
            if (form) startTransition(() => action(new FormData(form)));
          }}
        >
          <option value="vi">{LANGUAGE_LABEL.vi}</option>
          <option value="en">{LANGUAGE_LABEL.en}</option>
        </select>
      </label>
      <p className="text-sm leading-6 text-muted-foreground">
        {t.languageHelp}
      </p>
      <button className="primary-action min-h-11" disabled={pending}>
        {pending ? t.saving : t.saveLanguage}
      </button>
    </form>
  );
}
