"use client";

import { useTransition } from "react";
import type { Language } from "@/lib/i18n";

export function LanguageForm({ current, action }: { current: Language; action: (formData: FormData) => Promise<void> }) {
  const [pending, startTransition] = useTransition();
  return <form className="grid gap-3" action={action}>
    <label className="grid gap-2 text-sm font-medium text-[#123c36]">Ng?n ng? / Language
      <select name="language" defaultValue={current} className="min-h-11 rounded-xl border border-[#123c36]/15 bg-white px-3" onChange={(event) => {
        const form = event.currentTarget.form;
        if (form) startTransition(() => action(new FormData(form)));
      }}>
        <option value="vi">Ti?ng Vi?t</option>
        <option value="en">English</option>
      </select>
    </label>
    <p className="text-sm leading-6 text-muted-foreground">L?a ch?n ???c l?u theo t?i kho?n v? gi? sau khi ??ng xu?t/??ng nh?p l?i.</p>
    <button className="primary-action min-h-11" disabled={pending}>{pending ? "?ang l?u?" : "L?u ng?n ng?"}</button>
  </form>;
}
