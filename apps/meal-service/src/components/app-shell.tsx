import Link from "next/link";
import type { SessionUser } from "@/lib/auth";

const ROLE_LABEL = { ADMIN: "Quản trị", DIETITIAN: "Dinh dưỡng", NURSE: "Điều dưỡng", KITCHEN: "Nhà bếp" } as const;
const NAVIGATION = {
  ADMIN: [["/", "Hôm nay"], ["/lich", "Lịch"], ["/kho", "Kho"], ["/bao-cao", "Báo cáo"], ["/quan-tri", "Quản trị"]],
  DIETITIAN: [["/", "Việc tiếp theo"], ["/lich", "Lịch"], ["/thuc-don", "Lên thực đơn"], ["/kho", "Kho"], ["/bao-cao", "Báo cáo"]],
  NURSE: [["/", "Việc tiếp theo"], ["/bao-suat", "Báo suất"], ["/lich", "Lịch"], ["/bao-cao", "Báo cáo"]],
  KITCHEN: [["/", "Việc tiếp theo"], ["/bep", "Bữa tiếp theo"], ["/lich", "Lịch"], ["/kho", "Kho"], ["/bao-cao", "Báo cáo"]],
} as const;

export function AppShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  return <div className="app-frame"><header className="app-header">
    <Link href="/" className="brand">Suất ăn bệnh viện</Link>
    <nav aria-label="Điều hướng chính">{NAVIGATION[user.role].map(([href, label]) => <Link href={href} key={href}>{label}</Link>)}</nav>
    <div className="user-summary"><strong>{user.displayName}</strong><span>{ROLE_LABEL[user.role]}</span></div>
  </header>{children}</div>;
}
