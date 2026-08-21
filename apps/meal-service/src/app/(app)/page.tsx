import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { LoginForm } from "@/components/login-form";
import { PatientAccessForm } from "@/components/patient-access-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSessionUser } from "@/lib/auth";

const HOME_COPY = {
  ADMIN: { title: "Kiểm tra vận hành hôm nay", description: "Theo dõi các bữa cần chú ý và mở lịch để kiểm tra theo tuần.", action: "Xem lịch toàn viện" },
  DIETITIAN: { title: "Thực đơn nào cần lên tiếp?", description: "Mở lịch để nhận biết bữa và chế độ chưa có thực đơn. Nhập món sẽ được triển khai ở M2.", action: "Kiểm tra lịch thực đơn" },
  NURSE: { title: "Bạn cần báo suất hôm nay", description: "Nhập số suất theo từng chế độ cho khoa được gán. Bạn có thể sửa trước giờ chốt.", action: "Báo suất khoa mình" },
  KITCHEN: { title: "Bữa nào cần xử lý tiếp?", description: "Mở lịch để theo dõi trạng thái và số suất tổng theo từng chế độ.", action: "Xem lịch chế biến" },
} as const;

const DEMO_ACCOUNTS = process.env.DEMO_LOGIN_BUTTONS === "1"
  ? [
      { label: "Quản trị / Trưởng khoa", email: "admin@demo.local", password: "Demo-Admin-2026!" },
      { label: "Dinh dưỡng", email: "dietitian@demo.local", password: "Demo-Dietitian-2026!" },
      { label: "Điều dưỡng", email: "nurse@demo.local", password: "Demo-Nurse-2026!" },
      { label: "Nhà bếp", email: "kitchen@demo.local", password: "Demo-Kitchen-2026!" },
    ]
  : [];

export default async function HomePage() {
  const user = await getSessionUser();
  if (!user) {
    return (
      <main className="grid min-h-[100dvh] bg-[#f3f6f4] min-[900px]:grid-cols-[minmax(0,1.08fr)_minmax(400px,0.92fr)]">
        <section className="flex flex-col justify-between bg-[#123c36] px-5 py-8 text-white sm:px-10 min-[900px]:min-h-[100dvh] min-[900px]:px-[clamp(3rem,6vw,6.5rem)] min-[900px]:py-12">
          <div className="max-w-2xl"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#b9d9cf]">Hệ thống điều phối suất ăn</p><h1 className="mt-5 max-w-xl text-3xl font-semibold leading-tight tracking-[-0.035em] sm:text-4xl lg:text-5xl">Mỗi bữa ăn được chuẩn bị đúng việc, đúng thời điểm.</h1><p className="mt-5 max-w-xl text-base leading-relaxed text-[#d8e8e3]">Lịch tuần chung giúp dinh dưỡng, điều dưỡng, bếp và quản trị phối hợp trên cùng một nguồn dữ liệu.</p></div>
          <Card className="mt-10 max-w-xl border-white/15 bg-white/[0.07] text-white shadow-none backdrop-blur-sm"><CardHeader><CardDescription className="text-xs font-semibold uppercase tracking-[0.1em] text-[#b9d9cf]">Dành cho bệnh nhân và người nhà</CardDescription><CardTitle className="text-xl">Xem bữa ăn của khoa</CardTitle></CardHeader><CardContent className="[&_input]:bg-white [&_input]:text-foreground [&_label]:text-white [&_p]:text-[#d8e8e3]"><PatientAccessForm /></CardContent></Card>
        </section>
        <section className="flex items-center justify-center px-4 py-10 sm:px-8" aria-labelledby="login-title">
          <Card className="w-full max-w-md border-[#123c36]/10 shadow-[0_18px_50px_rgba(18,60,54,0.08)]"><CardHeader><CardDescription className="text-xs font-semibold uppercase tracking-[0.1em] text-[#0f6e56]">Dành cho nhân viên</CardDescription><CardTitle id="login-title" className="text-2xl tracking-[-0.025em]">Đăng nhập</CardTitle><CardDescription>Sử dụng tài khoản được bệnh viện cấp để tiếp tục.</CardDescription></CardHeader><CardContent><LoginForm demoAccounts={DEMO_ACCOUNTS} /></CardContent></Card>
        </section>
      </main>
    );
  }
  const copy = HOME_COPY[user.role];
  return (
    <AppShell user={user}>
      <main className="workspace role-home">
        <p className="eyebrow">Việc tiếp theo</p>
        <h1>{copy.title}</h1>
        <p className="lead">{copy.description}</p>
        <Link className="primary-link" href={user.role === "DIETITIAN" ? "/thuc-don" : user.role === "NURSE" ? "/bao-suat" : "/lich"}>{copy.action}</Link>
      </main>
    </AppShell>
  );
}
