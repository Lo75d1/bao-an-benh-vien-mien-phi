import { redirect } from "next/navigation";
import { Building2, Mail, ShieldCheck, UserRound } from "lucide-react";
import { PasswordForm } from "./password-form";
import { LanguageForm } from "./language-form";
import { changeLanguageAction } from "./actions";
import { AppShell } from "@/components/app-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeLanguage } from "@/lib/i18n";
import { PROFILE_TEXT } from "./catalog";

function ProfileField({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
}) {
  return (
    <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3">
      <span className="grid size-10 place-items-center rounded-xl bg-[#e1f5ee] text-[#0f6e56]">
        <Icon className="size-5" strokeWidth={1.8} />
      </span>
      <div className="min-w-0 border-b border-[#123c36]/10 pb-4">
        <dt className="text-sm text-muted-foreground">{label}</dt>
        <dd className="mt-1 break-words font-medium text-[#123c36]">{value}</dd>
      </div>
    </div>
  );
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ first?: string }>;
}) {
  const sessionUser = await getSessionUser({ allowPasswordChange: true });
  if (!sessionUser) redirect("/");
  const firstLogin =
    sessionUser.mustChangePassword || (await searchParams).first === "1";

  const profile = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      email: true,
      displayName: true,
      role: true,
      language: true,
      memberships: { select: { department: { select: { name: true } } } },
    },
  });
  if (!profile) redirect("/");
  const language = normalizeLanguage(profile.language);
  const t = PROFILE_TEXT[language];

  const departments = profile.memberships.map(
    ({ department }) => department.name,
  );
  const departmentValue = departments.length > 0 ? departments.join(", ") : "—";
  const invalidNurseDepartment =
    profile.role === "NURSE" && departments.length !== 1;

  return (
    <AppShell user={sessionUser}>
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        {firstLogin ? (
          <div
            role="alert"
            className="mb-6 rounded-2xl border border-blue-900/15 bg-blue-50 px-5 py-4 text-blue-950"
          >
            <strong>{t.firstTitle}</strong>
            <p className="mt-1 text-sm leading-6">{t.firstHelp}</p>
          </div>
        ) : null}
        <header className="mb-7">
          <p className="text-sm font-semibold text-[#0f6e56]">
            {t.eyebrow}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.035em] text-[#123c36]">
            {t.title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {t.intro}
          </p>
        </header>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <Card className="rounded-2xl border-[#123c36]/10 shadow-none">
            <CardHeader>
              <CardTitle className="text-xl text-[#123c36]">
                {t.profileTitle}
              </CardTitle>
              <CardDescription>
                {t.profileHelp}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4">
                <ProfileField
                  icon={UserRound}
                  label={t.name}
                  value={profile.displayName}
                />
                <ProfileField icon={Mail} label={t.email} value={profile.email} />
                <ProfileField
                  icon={ShieldCheck}
                  label={t.role}
                  value={t.roles[profile.role]}
                />
                {profile.role === "NURSE" ? (
                  <ProfileField
                    icon={Building2}
                    label={t.department}
                    value={departmentValue}
                  />
                ) : null}
              </dl>
              {invalidNurseDepartment ? (
                <p
                  role="alert"
                  className="mt-4 rounded-xl border border-amber-700/20 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900"
                >
                  {t.departmentWarning}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-[#123c36]/10 shadow-none">
            <CardHeader>
              <CardTitle className="text-xl text-[#123c36]">
                {t.passwordTitle}
              </CardTitle>
              <CardDescription>
                {t.passwordHelp}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PasswordForm required={firstLogin} role={profile.role} language={language} />
            </CardContent>
          </Card>
        </div>
      </main>
    </AppShell>
  );
}
