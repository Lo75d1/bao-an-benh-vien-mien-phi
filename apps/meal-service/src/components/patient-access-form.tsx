"use client";

import { useState } from "react";

export function PatientAccessForm() {
  const [token, setToken] = useState("");
  return <form className="patient-access-form" onSubmit={(event) => { event.preventDefault(); const value = token.trim(); if (value) window.location.assign(`/k/${encodeURIComponent(value)}`); }}>
    <label htmlFor="department-token">Mã khoa trên thẻ QR</label>
    <div><input id="department-token" name="departmentToken" value={token} onChange={(event) => setToken(event.target.value)} autoComplete="off" spellCheck={false} required placeholder="Ví dụ: KHOA-NOI…"/><button type="submit">Xem bữa ăn</button></div>
    <p>Nếu đang dùng điện thoại, bạn có thể quét QR của khoa để vào thẳng màn này.</p>
  </form>;
}
