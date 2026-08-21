import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/presentation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readOperationalSettings } from "@/lib/settings";
import { accountStatusAction, dietTypeStatusAction, saveAccountAction, saveDietTypeAction, saveSettingsAction } from "./actions";
import { AccountCreateForm, SettingsForm } from "./admin-forms";
import { AccountTable } from "./account-table";
import { DietTypeTable } from "./diet-type-table";

const roleLabel = { ADMIN: "Quản trị", DIETITIAN: "Dinh dưỡng", NURSE: "Điều dưỡng", KITCHEN: "Nhà bếp" } as const;
const messages: Record<string, string> = { settings: "Đã áp dụng cấu hình và ghi nhật ký.", created: "Đã tạo tài khoản với mật khẩu được băm scrypt.", account: "Đã cập nhật tài khoản.", status: "Đã đổi trạng thái tài khoản, không xóa lịch sử.", diet: "Đã lưu mã chế độ ăn.", "diet-status": "Đã đổi trạng thái mã chế độ ăn, không xóa lịch sử." };

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ updated?: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/");
  if (user.role !== "ADMIN") redirect("/");
  const [{ updated }, settings, mealTypes, users, departments, dietTypes, dietCodes] = await Promise.all([
    searchParams,
    readOperationalSettings(),
    prisma.mealType.findMany({ where: { status: "ACTIVE" }, orderBy: { sortOrder: "asc" } }),
    prisma.user.findMany({ orderBy: [{ status: "asc" }, { displayName: "asc" }], include: { memberships: { include: { department: true } } } }),
    prisma.department.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" } }),
    prisma.dietType.findMany({ orderBy: [{ status: "asc" }, { sortOrder: "asc" }], include: { dietCodeRef: true } }),
    prisma.dietCode.findMany({ orderBy: { code: "asc" }, select: { id: true, code: true, name: true } }),
  ]);
  return <AppShell user={user}><main className="workspace admin-page">
    <PageHeader eyebrow="Quản trị hệ thống" title="Cấu hình, nhân sự và mã chế độ ăn" description="Quản lý vận hành, tài khoản và danh mục mà không xóa lịch sử." actions={<p className="scope-note">Chỉ ADMIN · mọi thay đổi đều được truy vết</p>}/>
    {updated && messages[updated] && <p className="success-banner" role="status">{messages[updated]}</p>}
    <nav className="admin-section-nav" aria-label="Mục quản trị"><a href="#settings">Cài đặt</a><a href="#accounts">Nhân sự</a><a href="#diet-types">Mã chế độ</a><a href="/quan-tri/audit">Nhật ký</a></nav>

    <section id="settings" className="admin-panel"><div className="section-heading"><div><p className="eyebrow">Cài đặt vận hành</p><h2>Áp dụng cho các luồng nghiệp vụ</h2></div><span>Giờ chốt · Sonde · Kho</span></div>
      <SettingsForm settings={{ advanceEntryDays: settings.advanceEntryDays, sondeEnabled: settings.sondeEnabled, warehouseMode: settings.warehouseMode, warehouseApprovalRole: settings.warehouseApprovalRole as "ADMIN" | "DIETITIAN" | "KITCHEN" }} mealTypes={mealTypes} action={saveSettingsAction}/>
    </section>

    <section id="accounts" className="admin-panel"><div className="section-heading"><div><p className="eyebrow">Nhân sự & tài khoản</p><h2>Tạo tài khoản mới</h2></div><span>Mật khẩu băm scrypt, không lưu plaintext</span></div>
      <AccountCreateForm departments={departments} action={saveAccountAction}/>
      <AccountTable departments={departments} saveAction={saveAccountAction} statusAction={accountStatusAction} data={users.map((account) => ({ id: account.id, name: account.displayName, email: account.email, role: account.role, roleLabel: roleLabel[account.role], departmentId: account.memberships[0]?.departmentId ?? "", department: account.memberships[0]?.department.name ?? "—", status: account.status, statusLabel: account.status === "ACTIVE" ? "Đang hoạt động" : "Đã vô hiệu" }))}/>
    </section>

    <section id="diet-types" className="admin-panel"><div className="section-heading"><div><p className="eyebrow">Mã chế độ / quy định</p><h2>Danh mục DietType</h2></div><span>Vô hiệu hóa, không hard-delete</span></div>
      <form action={saveDietTypeAction} className="admin-grid"><label>Mã<input name="code" pattern="[A-Za-z0-9_-]{2,20}" required/></label><label>Tên chế độ<input name="name" required/></label><label>Đường nuôi<select name="feedingRoute"><option value="NORMAL">Ăn thường</option><option value="SONDE">Sonde</option></select></label><label>Quy định dinh dưỡng<select name="dietCodeRefId"><option value="">—</option>{dietCodes.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></label><label>Thứ tự<input name="sortOrder" type="number" min="0" max="999" defaultValue="0" required/></label><button className="primary-action">Tạo mã chế độ</button></form>
      <DietTypeTable dietCodes={dietCodes} saveAction={saveDietTypeAction} statusAction={dietTypeStatusAction} data={dietTypes.map((diet) => ({ id: diet.id, code: diet.code, name: diet.name, feedingRoute: diet.feedingRoute, routeLabel: diet.feedingRoute === "SONDE" ? "Sonde" : "Ăn thường", dietCodeRefId: diet.dietCodeRefId ?? "", dietCode: diet.dietCodeRef?.code ?? "—", sortOrder: diet.sortOrder, status: diet.status, statusLabel: diet.status === "ACTIVE" ? "Đang dùng" : "Đã vô hiệu" }))}/>
    </section>
  </main></AppShell>;
}
