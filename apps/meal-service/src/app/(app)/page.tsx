import { redirect } from "next/navigation";
import Image from "next/image";
import { LoginForm } from "@/components/login-form";
import { PatientAccessForm } from "@/components/patient-access-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSessionUser } from "@/lib/auth";
import { readBrandingSettings } from "@/lib/branding";

const DEMO_ACCOUNTS = process.env.DEMO_LOGIN_BUTTONS === "1"
  ? [
      { label: "Quản trị / Trưởng khoa", email: "admin@demo.local", password: "Demo-Admin-2026!" },
      { label: "Dinh dưỡng", email: "dietitian@demo.local", password: "Demo-Dietitian-2026!" },
      { label: "Điều dưỡng", email: "nurse@demo.local", password: "Demo-Nurse-2026!" },
      { label: "Nhà bếp", email: "kitchen@demo.local", password: "Demo-Kitchen-2026!" },
    ]
  : [];

export default async function HomePage() {
  const [user, branding] = await Promise.all([getSessionUser(), readBrandingSettings()]);
  if (!user) {
    return (
      <main className="login-page grid min-h-[100dvh] min-[900px]:grid-cols-[minmax(0,1.08fr)_minmax(400px,0.92fr)]">
        <a className="skip-link" href="#login-title">Chuyển đến đăng nhập</a>
        <section className="login-intro flex flex-col justify-between px-5 py-8 text-white sm:px-10 min-[900px]:min-h-[100dvh] min-[900px]:px-[clamp(3rem,6vw,6.5rem)] min-[900px]:py-12" aria-labelledby="public-home-title">
          <div className="login-hero-copy max-w-2xl"><p className="login-brand-name">{branding.logoDataUrl ? <Image src={branding.logoDataUrl} alt="" width={42} height={42} unoptimized/> : <span>{branding.shortName}</span>}<strong>{branding.organizationName}</strong></p><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#b9d9cf]">Hệ thống điều phối suất ăn</p><h1 id="public-home-title" className="mt-5 max-w-xl text-3xl font-semibold leading-tight tracking-[-0.035em] text-balance sm:text-4xl lg:text-5xl">Mỗi bữa ăn được chuẩn bị đúng việc, đúng thời điểm.</h1><p className="mt-5 max-w-xl text-base leading-relaxed text-[#d8e8e3]">Lịch tuần chung giúp dinh dưỡng, điều dưỡng, bếp và quản trị phối hợp trên cùng một nguồn dữ liệu.</p></div>
          <Card className="public-patient-entry mt-10 max-w-xl border-white/15 bg-white/[0.07] text-white shadow-none"><CardHeader><CardDescription className="text-xs font-semibold uppercase tracking-[0.1em] text-[#b9d9cf]">Dành cho bệnh nhân và người nhà</CardDescription><CardTitle className="text-xl">Xem bữa ăn của khoa</CardTitle></CardHeader><CardContent className="[&_input]:bg-white [&_input]:text-foreground [&_label]:text-white [&_p]:text-[#d8e8e3]"><PatientAccessForm /></CardContent></Card>
        </section>
        <section className="login-panel flex items-center justify-center px-4 py-10 sm:px-8" aria-labelledby="login-title">
          <Card className="login-card w-full max-w-md border-[#123c36]/10 shadow-none"><CardHeader><CardDescription className="text-xs font-semibold uppercase tracking-[0.1em] text-[#0f6e56]">Dành cho nhân viên</CardDescription><CardTitle id="login-title" className="text-2xl tracking-[-0.025em] text-balance">Đăng nhập</CardTitle><CardDescription>Sử dụng tài khoản được bệnh viện cấp để tiếp tục.</CardDescription></CardHeader><CardContent><LoginForm demoAccounts={DEMO_ACCOUNTS} /></CardContent></Card>
        </section>
      </main>
    );
  }
  redirect({ ADMIN: "/quan-ly", DIETITIAN: "/lich", NURSE: "/bao-suat", KITCHEN: "/bep" }[user.role]);
}
