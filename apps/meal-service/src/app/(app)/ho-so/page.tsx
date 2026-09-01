import { redirect } from "next/navigation";
import { Building2, Mail, ShieldCheck, UserRound } from "lucide-react";
import { PasswordForm } from "./password-form";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSessionUser } from "@/lib/auth";
import { getTranslations } from "@/lib/locale";
import { readLocale } from "@/lib/locale-server";
import { prisma } from "@/lib/prisma";

function ProfileField({ icon: Icon, label, value }: { icon: typeof UserRound; label: string; value: string }) {
  return <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#e1f5ee] text-[#0f6e56]"><Icon className="size-5" strokeWidth={1.8} /></span><div className="min-w-0 border-b border-[#123c36]/10 pb-4"><dt className="text-sm text-muted-foreground">{label}</dt><dd className="mt-1 break-words font-medium text-[#123c36]">{value}</dd></div></div>;
}

export default async function ProfilePage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/");
  const locale = await readLocale();
  const t = getTranslations(locale).management.profilePage;
  const roleLabels = getTranslations(locale).role;
  const profile = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { email: true, displayName: true, role: true, memberships: { select: { department: { select: { name: true } } } } },
  });
  if (!profile) redirect("/");

  const departments = profile.memberships.map(({ department }) => department.name);
  const departmentValue = departments.length > 0 ? departments.join(", ") : "-";
  const invalidNurseDepartment = profile.role === "NURSE" && departments.length !== 1;

  return <AppShell user={sessionUser}><main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10"><header className="mb-7"><p className="text-sm font-semibold text-[#0f6e56]">{t.eyebrow}</p><h1 className="mt-1 text-3xl font-semibold tracking-[-0.035em] text-[#123c36]">{t.title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{t.description}</p></header>
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"><Card className="rounded-2xl border-[#123c36]/10 shadow-none"><CardHeader><CardTitle className="text-xl text-[#123c36]">{t.infoTitle}</CardTitle><CardDescription>{t.infoDescription}</CardDescription></CardHeader><CardContent><dl className="grid gap-4"><ProfileField icon={UserRound} label={t.fullName} value={profile.displayName} /><ProfileField icon={Mail} label="Email" value={profile.email} /><ProfileField icon={ShieldCheck} label={t.role} value={roleLabels[profile.role]} />{profile.role === "NURSE" ? <ProfileField icon={Building2} label={t.department} value={departmentValue} /> : null}</dl>{invalidNurseDepartment ? <p role="alert" className="mt-4 rounded-xl border border-amber-700/20 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">{t.invalidDepartment}</p> : null}</CardContent></Card>
    <Card className="rounded-2xl border-[#123c36]/10 shadow-none"><CardHeader><CardTitle className="text-xl text-[#123c36]">{t.passwordTitle}</CardTitle><CardDescription>{t.passwordDescription}</CardDescription></CardHeader><CardContent><PasswordForm role={profile.role} /></CardContent></Card></div>
  </main></AppShell>;
}
