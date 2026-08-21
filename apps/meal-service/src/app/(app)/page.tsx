import Link from "next/link";
import { AlertTriangle, ArrowRight, CalendarDays, ChefHat, ClipboardCheck, NotebookPen, PackageSearch, Stethoscope, Utensils, type LucideIcon } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { LoginForm } from "@/components/login-form";
import { PatientAccessForm } from "@/components/patient-access-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { getSessionUser } from "@/lib/auth";
import { readRoleOverview, type AdminOverview, type DietitianOverview, type KitchenOverview, type NurseOverview, type OverviewNumber } from "@/lib/overview";

const DEMO_ACCOUNTS = process.env.DEMO_LOGIN_BUTTONS === "1"
  ? [
      { label: "Quản trị / Trưởng khoa", email: "admin@demo.local", password: "Demo-Admin-2026!" },
      { label: "Dinh dưỡng", email: "dietitian@demo.local", password: "Demo-Dietitian-2026!" },
      { label: "Điều dưỡng", email: "nurse@demo.local", password: "Demo-Nurse-2026!" },
      { label: "Nhà bếp", email: "kitchen@demo.local", password: "Demo-Kitchen-2026!" },
    ]
  : [];

const dateLabel = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", weekday: "long", day: "2-digit", month: "2-digit" });

function MetricValue({ value, suffix }: { value: OverviewNumber; suffix?: string }) {
  return <span className="tabular-nums text-3xl font-semibold tracking-[-0.035em] text-[#123c36]">{value === null ? "—" : value}{value !== null && suffix ? <small className="ml-1 text-sm font-medium text-muted-foreground">{suffix}</small> : null}</span>;
}

function DashboardLink({ href, children, variant = "outline" }: { href: string; children: React.ReactNode; variant?: "default" | "outline" | "ghost" }) {
  return <Button asChild variant={variant}><Link href={href}>{children}<ArrowRight /></Link></Button>;
}

function AdminHome({ data }: { data: AdminOverview }) {
  const alerts = [
    { title: "Chế độ chưa có thực đơn duyệt", value: data.missingMenuCount, href: "/lich", action: "Kiểm tra lịch", icon: Utensils },
    { title: "Suất bổ sung chờ bếp xác nhận", value: data.pendingAdditionCount, href: "/bao-cao", action: "Mở báo cáo", icon: ChefHat },
    { title: "Dòng thực xuất lệch dự kiến", value: data.warehouseVarianceCount, href: "/kho", action: "Kiểm tra kho", icon: PackageSearch },
  ];
  return <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
    <header className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold text-[#0f6e56]">Hôm nay</p><h1 className="mt-1 text-3xl font-semibold tracking-[-0.035em] text-[#123c36]">Tổng quan vận hành</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Những con số và ngoại lệ cần kiểm tra trong ngày. Dấu “—” nghĩa là chưa đủ dữ liệu để kết luận.</p></div><DashboardLink href="/lich">Mở lịch toàn viện</DashboardLink></header>
    <section className="grid gap-4 sm:grid-cols-2" aria-label="Số liệu hôm nay">
      <Card className="rounded-2xl border-[#123c36]/10 shadow-none"><CardHeader className="flex-row items-center justify-between"><div><CardDescription>Bữa trong lịch hôm nay</CardDescription><CardTitle className="mt-2"><MetricValue value={data.mealCount} suffix="bữa" /></CardTitle></div><span className="grid size-11 place-items-center rounded-xl bg-[#e1f5ee] text-[#0f6e56]"><CalendarDays /></span></CardHeader><CardContent className="text-sm text-muted-foreground">Chỉ đếm các bữa đã có trong lịch, không tự tạo số liệu.</CardContent></Card>
      <Card className="rounded-2xl border-[#123c36]/10 shadow-none"><CardHeader className="flex-row items-center justify-between"><div><CardDescription>Khoa đã có báo suất</CardDescription><CardTitle className="mt-2"><MetricValue value={data.departmentCount} suffix="khoa" /></CardTitle></div><span className="grid size-11 place-items-center rounded-xl bg-[#e1f5ee] text-[#0f6e56]"><Stethoscope /></span></CardHeader><CardContent className="text-sm text-muted-foreground">Số khoa có ít nhất một báo suất đã gửi trong hôm nay.</CardContent></Card>
    </section>
    <section className="mt-7" aria-labelledby="admin-alerts"><div className="mb-3 flex items-center justify-between"><div><p className="text-sm font-semibold text-[#0f6e56]">Cần chú ý</p><h2 id="admin-alerts" className="mt-1 text-xl font-semibold text-[#123c36]">Cảnh báo vận hành</h2></div><Badge variant="outline" className="border-amber-700/25 bg-amber-50 text-amber-800"><AlertTriangle />Kiểm tra ngoại lệ</Badge></div>
      <div className="grid gap-4 lg:grid-cols-3">{alerts.map(({ title, value, href, action, icon: Icon }) => <Card key={title} className="rounded-2xl border-[#123c36]/10 shadow-none"><CardHeader><span className="grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-700"><Icon /></span><CardTitle className="pt-2 text-base leading-6">{title}</CardTitle><CardDescription>{value === null ? "Chưa đủ dữ liệu đối chiếu. Hãy mở trang liên quan để kiểm tra." : value === 0 ? "Không có cảnh báo từ dữ liệu hiện có." : "Có mục cần xử lý hoặc xác minh."}</CardDescription></CardHeader><CardContent><MetricValue value={value} suffix="mục" /></CardContent><CardFooter><DashboardLink href={href} variant="ghost">{action}</DashboardLink></CardFooter></Card>)}</div>
    </section>
  </main>;
}

function NurseHome({ data }: { data: NurseOverview }) {
  return <RoleTask title="Báo suất hôm nay" description={data.departmentName ? `${data.departmentName} · Khoa được gán tự động` : "Tài khoản chưa có đúng một khoa để đọc dữ liệu."} icon={ClipboardCheck} action={<DashboardLink href="/bao-suat" variant="default">Tới Báo suất</DashboardLink>}>
    <div className="grid gap-4 sm:grid-cols-2"><Summary label="Tiến độ báo suất" value={data.reportedMealCount} suffix={data.mealCount === null ? "bữa" : `/ ${data.mealCount} bữa`} note="Bữa đã có báo suất gửi từ khoa mình." /><Summary label="Ghi chú chờ duyệt" value={data.pendingNoteCount} suffix="ghi chú" note="Mở Báo suất để duyệt hoặc từ chối." /></div>
  </RoleTask>;
}

function DietitianHome({ data }: { data: DietitianOverview }) {
  return <RoleTask title="Thực đơn cần lên" description="Ưu tiên các ngày và chế độ chưa có thực đơn duyệt trong cửa sổ nhập liệu đã cấu hình." icon={NotebookPen} action={<DashboardLink href="/thuc-don" variant="default">Tới Thực đơn</DashboardLink>}>
    <Summary label="Ngày × chế độ chưa hoàn tất" value={data.missingDateDietCount} suffix="mục" note={data.missingDateDietCount === null ? "Chưa có dữ liệu lịch để xác định việc cần làm." : "Mỗi ngày và chế độ chỉ được tính một lần, dù có nhiều bữa."} />
  </RoleTask>;
}

function KitchenHome({ data }: { data: KitchenOverview }) {
  const mealLabel = data.nextMealName && data.nextMealDate ? `${data.nextMealName} · ${dateLabel.format(data.nextMealDate)}` : "Chưa có bữa cần xử lý";
  return <RoleTask title={mealLabel} description={data.serviceTime ? `Phục vụ lúc ${data.serviceTime}` : "Chưa có giờ phục vụ từ lịch."} icon={ChefHat} action={<DashboardLink href="/bep" variant="default">Tới Bếp</DashboardLink>}>
    <div className="grid gap-4 sm:grid-cols-2"><Summary label="Số suất bữa tiếp theo" value={data.servingCount} suffix="suất" note="Gồm suất đã báo và mọi suất bổ sung của bữa này." /><Summary label="Suất bổ sung chờ xác nhận" value={data.pendingAdditionCount} suffix="yêu cầu" note="Mở Bếp để xác nhận nhận, thiếu hoặc cần thay thế." warning={data.pendingAdditionCount !== null && data.pendingAdditionCount > 0} /></div>
  </RoleTask>;
}

function Summary({ label, value, suffix, note, warning = false }: { label: string; value: OverviewNumber; suffix: string; note: string; warning?: boolean }) {
  return <Card className={`rounded-2xl shadow-none ${warning ? "border-amber-700/25 bg-amber-50/60" : "border-[#123c36]/10"}`}><CardHeader><CardDescription>{label}</CardDescription><CardTitle><MetricValue value={value} suffix={suffix} /></CardTitle></CardHeader><CardContent className="text-sm leading-6 text-muted-foreground">{value === null ? `— · ${note}` : note}</CardContent></Card>;
}

function RoleTask({ title, description, icon: Icon, action, children }: { title: string; description: string; icon: LucideIcon; action: React.ReactNode; children: React.ReactNode }) {
  return <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12"><Card className="overflow-hidden rounded-2xl border-[#123c36]/10 shadow-none"><CardHeader className="gap-5 border-b border-[#123c36]/10 bg-[#eaf3ee] sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-4"><span className="grid size-12 shrink-0 place-items-center rounded-xl bg-[#123c36] text-white"><Icon /></span><div><CardDescription className="font-semibold text-[#0f6e56]">Việc tiếp theo</CardDescription><CardTitle className="mt-1 text-2xl tracking-[-0.025em] text-[#123c36]">{title}</CardTitle><p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p></div></div>{action}</CardHeader><CardContent className="pt-6">{children}</CardContent></Card></main>;
}

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
  const overview = await readRoleOverview(user.role, user.id);
  return (
    <AppShell user={user}>
      {overview.kind === "ADMIN" ? <AdminHome data={overview} /> : overview.kind === "NURSE" ? <NurseHome data={overview} /> : overview.kind === "DIETITIAN" ? <DietitianHome data={overview} /> : <KitchenHome data={overview} />}
    </AppShell>
  );
}
