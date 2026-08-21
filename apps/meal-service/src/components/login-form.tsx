"use client";

import { useState } from "react";

type DemoAccount = { label: string; email: string; password: string };

export function LoginForm({ demoAccounts = [] }: { demoAccounts?: DemoAccount[] }) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function login(email: string, password: string) {
    setPending(true);
    setError("");
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setError(payload?.error ?? "Không thể đăng nhập. Vui lòng thử lại.");
      setPending(false);
      return;
    }
    window.location.assign("/");
  }

  return (
    <>
      <form action={(formData) => login(String(formData.get("email") ?? ""), String(formData.get("password") ?? ""))} className="login-form">
        <div>
          <label htmlFor="email">Email nhân viên</label>
          <input id="email" name="email" type="email" autoComplete="username" required />
        </div>
        <div>
          <label htmlFor="password">Mật khẩu</label>
          <input id="password" name="password" type="password" autoComplete="current-password" minLength={10} required />
        </div>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <button type="submit" disabled={pending}>{pending ? "Đang đăng nhập…" : "Đăng nhập"}</button>
      </form>
      {demoAccounts.length > 0 && (
        <div className="demo-logins">
          <p className="eyebrow">Đăng nhập nhanh (demo)</p>
          <div className="demo-login-grid">
            {demoAccounts.map((account) => (
              <button key={account.email} type="button" className="demo-login-btn" disabled={pending} onClick={() => login(account.email, account.password)}>
                {account.label}
              </button>
            ))}
          </div>
          <p className="demo-hint">Chỉ dành cho bản demo — bấm để điền sẵn tài khoản mẫu và vào xem.</p>
        </div>
      )}
    </>
  );
}
