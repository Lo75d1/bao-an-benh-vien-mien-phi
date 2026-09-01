"use client";

import { useState } from "react";
import type { Language } from "@/lib/i18n";

export function PatientAccessForm({ language = "vi" }: { language?: Language }) {
  const [token, setToken] = useState("");
  return <form className="patient-access-form" onSubmit={(event) => { event.preventDefault(); const value = token.trim(); if (value) window.location.assign(`/k/${encodeURIComponent(value)}`); }}>
    <label htmlFor="department-token">{language === "en" ? "Department code on the QR card" : "Mã khoa trên thẻ QR"}</label>
    <div><input id="department-token" name="departmentToken" value={token} onChange={(event) => setToken(event.target.value)} autoComplete="off" spellCheck={false} required placeholder={language === "en" ? "Example: INTERNAL-MED…" : "Ví dụ: KHOA-NOI…"}/><button type="submit">{language === "en" ? "View meals" : "Xem bữa ăn"}</button></div>
    <p>{language === "en" ? "On a phone, scan your department's QR code to open this screen directly." : "Nếu đang dùng điện thoại, bạn có thể quét QR của khoa để vào thẳng màn này."}</p>
  </form>;
}
