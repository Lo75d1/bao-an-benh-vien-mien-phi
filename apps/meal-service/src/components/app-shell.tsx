import Link from "next/link";
import type { SessionUser } from "@/lib/auth";

const ROLE_LABEL = { ADMIN: "Quản trị", DIETITIAN: "Dinh dưỡng", NURSE: "Điều dưỡng", KITCHEN: "Nhà bếp" } as const;

export function AppShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  return (
    <div className="app-frame">
      <header className="app-header">
        <Link href="/" className="brand">Suất ăn bệnh viện</Link>
        <nav aria-label="Điều hướng chính">
          <Link href="/">Việc tiếp theo</Link>
          <Link href="/lich">Lịch tuần</Link>
          {user.role === "NURSE" && <Link href="/bao-suat">Báo suất</Link>}
          {user.role === "DIETITIAN" && <Link href="/thuc-don">Lên thực đơn</Link>}
          {user.role === "KITCHEN" && <Link href="/bep">Bữa tiếp theo</Link>}
        </nav>
        <div className="user-summary"><strong>{user.displayName}</strong><span>{ROLE_LABEL[user.role]}</span></div>
      </header>
      {children}
    </div>
  );
}
