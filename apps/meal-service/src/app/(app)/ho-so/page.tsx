import { redirect } from "next/navigation";
import { Building2, Mail, ShieldCheck, UserRound } from "lucide-react";
import { PasswordForm } from "./password-form";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ROLE_LABEL = { ADMIN: "Quản trị", DIETITIAN: "Dinh dưỡng", NURSE: "Điều dưỡng", KITCHEN: "Nhà bếp" } as const;

function ProfileField({ icon: Icon, label, value }: { icon: typeof UserRound; label: string; value: string }) {
  return (
    <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3">
      <span className="grid size-10 place-items-center rounded-xl bg-[#e1f5ee] text-[#0f6e56]"><Icon className="size-5" strokeWidth={1.8} /></span>
      <div className="min-w-0 border-b border-[#123c36]/10 pb-4">
        <dt className="text-sm text-muted-foreground">{label}</dt>
        <dd className="mt-1 break-words font-medium text-[#123c36]">{value}</dd>
      </div>
    </div>
  );
}

export default async function ProfilePage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/");

  const profile = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { email: true, displayName: true, role: true, memberships: { select: { department: { select: { name: true } } } } },
  });
  if (!profile) redirect("/");

  const departments = profile.memberships.map(({ department }) => department.name);
  const departmentValue = departments.length > 0 ? departments.join(", ") : "—";
  const invalidNurseDepartment = profile.role === "NURSE" && departments.length !== 1;

  return (
    <AppShell user={sessionUser}>
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <header className="mb-7">
          <p className="text-sm font-semibold text-[#0f6e56]">Tài khoản cá nhân</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.035em] text-[#123c36]">Hồ sơ của tôi</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Xem thông tin được bệnh viện cấp và bảo vệ tài khoản bằng mật khẩu riêng.</p>
        </header>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <Card className="rounded-2xl border-[#123c36]/10 shadow-none">
            <CardHeader>
              <CardTitle className="text-xl text-[#123c36]">Thông tin hồ sơ</CardTitle>
              <CardDescription>Thông tin này chỉ có thể được thay đổi bởi quản trị viên.</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4">
                <ProfileField icon={UserRound} label="Họ và tên" value={profile.displayName} />
                <ProfileField icon={Mail} label="Email" value={profile.email} />
                <ProfileField icon={ShieldCheck} label="Vai trò" value={ROLE_LABEL[profile.role]} />
                {profile.role === "NURSE" ? <ProfileField icon={Building2} label="Khoa" value={departmentValue} /> : null}
              </dl>
              {invalidNurseDepartment ? <p role="alert" className="mt-4 rounded-xl border border-amber-700/20 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">Thông tin khoa đang thiếu hoặc chưa đúng. Vui lòng liên hệ quản trị viên.</p> : null}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-[#123c36]/10 shadow-none">
            <CardHeader>
              <CardTitle className="text-xl text-[#123c36]">Đổi mật khẩu</CardTitle>
              <CardDescription>Sau khi đổi, phiên hiện tại được giữ lại và các phiên đăng nhập khác sẽ bị đăng xuất.</CardDescription>
            </CardHeader>
            <CardContent><PasswordForm required={firstLogin} role={profile.role} /></CardContent>
          </Card>
        </div>
      </main>
    </AppShell>
  );
}
