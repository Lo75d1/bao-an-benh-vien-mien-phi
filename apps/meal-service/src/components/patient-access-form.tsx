"use client";

import { useState } from "react";
import { getTranslations, readClientLocale } from "@/lib/locale";

export function PatientAccessForm() {
  const [token, setToken] = useState("");
  const t = getTranslations(readClientLocale()).public.patientAccess;
  return <form className="patient-access-form" onSubmit={(event) => { event.preventDefault(); const value = token.trim(); if (value) window.location.assign(`/k/${encodeURIComponent(value)}`); }}>
    <label htmlFor="department-token">{t.tokenLabel}</label>
    <div><input id="department-token" name="departmentToken" value={token} onChange={(event) => setToken(event.target.value)} autoComplete="off" spellCheck={false} required placeholder={t.tokenPlaceholder}/><button type="submit">{t.viewMeal}</button></div>
    <p>{t.help}</p>
  </form>;
}
