import { Separator } from "@/components/ui/separator";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/presentation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readOperationalSettings } from "@/lib/settings";
import { readBrandingSettings } from "@/lib/branding";
import { readPublicViewStats } from "@/lib/public-page-views";
import { accountStatusAction, dietTypeStatusAction, mealTypeStatusAction, saveAccountAction, saveBrandingAction, saveDietTypeAction, saveMealTypeAction, saveSettingsAction } from "./actions";
import { AccountCreateForm, SettingsForm } from "./admin-forms";
import { BrandingForm } from "./branding-form";
import { AccountTable } from "./account-table";
import { DietTypeTable } from "./diet-type-table";
import { MealTypeTable } from "./meal-type-table";

const roleLabel = { ADMIN: "Quản trị", DIETITIAN: "Dinh dưỡng", NURSE: "Điều dưỡng", KITCHEN: "Nhà bếp" } as const;
const messages: Record<string, string> = { branding: "Đã cập nhật nhận diện bệnh viện trên toàn hệ thống.", settings: "Đã áp dụng cấu hình và ghi nhật ký.", created: "Đã tạo tài khoản với mật khẩu được băm scrypt.", account: "Đã cập nhật tài khoản.", status: "Đã đổi trạng thái tài khoản, không xóa lịch sử.", diet: "Đã lưu mã chế độ ăn.", "diet-status": "Đã đổi trạng thái mã chế độ ăn, không xóa lịch sử.", meal: "Đã lưu bữa ăn.", "meal-status": "Đã đổi trạng thái bữa ăn, lịch sử cũ được giữ nguyên." };

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ updated?: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/");
  if (user.role !== "ADMIN") redirect("/");
  const [{ updated }, branding, settings, viewStats, mealTypes, users, departments, dietTypes, dietCodes] = await Promise.all([
    searchParams,
    readBrandingSettings(),
    readOperationalSettings(),
    readPublicViewStats(),
    prisma.mealType.findMany({ orderBy: [{ status: "asc" }, { sortOrder: "asc" }] }),
    prisma.user.findMany({ orderBy: [{ status: "asc" }, { displayName: "asc" }], include: { memberships: { include: { department: true } } } }),
    prisma.department.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" } }),
    prisma.dietType.findMany({ orderBy: [{ status: "asc" }, { sortOrder: "asc" }], include: { dietCodeRef: true } }),
    prisma.dietCode.findMany({ orderBy: { code: "asc" }, select: { id: true, code: true, name: true } }),
  ]);
  const activeUsers = users.filter((account) => account.status === "ACTIVE").length;
  const activeDiets = dietTypes.filter((diet) => diet.status === "ACTIVE").length;
  return <AppShell user={user}><main className="workspace admin-page admin-workspace"><Separator className="page-separator" aria-hidden="true"/>
    <PageHeader eyebrow="Trung tâm quản trị" title="Thiết lập để hệ thống vận hành đúng" description="Theo dõi cấu hình đang áp dụng, quản lý nhân sự và danh mục từ một nơi." actions={<p className="scope-note">Chỉ ADMIN · mọi thay đổi đều được truy vết</p>}/>
    {updated && messages[updated] && <p className="success-banner" role="status">{messages[updated]}</p>}
    <section className="admin-status-strip" aria-label="Trạng thái cấu hình"><div><span>Tài khoản hoạt động</span><strong className="tabular">{activeUsers}<small> / {users.length}</small></strong></div><div><span>Khoa đang dùng</span><strong className="tabular">{departments.length}</strong></div><div><span>Mã chế độ hoạt động</span><strong className="tabular">{activeDiets}<small> / {dietTypes.length}</small></strong></div><div><span>Lượt xem hôm nay</span><strong className="tabular">{viewStats.today}</strong></div><div><span>Tổng lượt xem</span><strong className="tabular">{viewStats.total}</strong></div><div><span>Cửa sổ nhập liệu</span><strong className="tabular">{settings.advanceEntryDays}<small> ngày</small></strong></div><div><span>Đường nuôi Sonde</span><strong className={settings.sondeEnabled ? "status-on" : "status-off"}>{settings.sondeEnabled ? "Đang bật" : "Đang tắt"}</strong></div><div><span>Mô hình kho</span><strong>Mode {settings.warehouseMode}</strong></div></section>

    <div className="admin-command-layout"><aside className="admin-context-rail"><p>Đi tới</p><nav className="admin-section-nav" aria-label="Mục quản trị"><a href="#branding"><strong>Nhận diện bệnh viện</strong><span>Tên, logo, màu chủ đạo</span></a><a href="#settings"><strong>Cài đặt vận hành</strong><span>Giờ chốt, Sonde, kho</span></a><a href="#accounts"><strong>Nhân sự</strong><span>{activeUsers} tài khoản hoạt động</span></a><a href="#diet-types"><strong>Mã chế độ</strong><span>{activeDiets} mã đang dùng</span></a></nav><div className="admin-rail-links"><a href="/quan-ly">Mở bàn điều phối</a><a href="/quan-tri/audit">Xem nhật ký thay đổi</a></div></aside><div className="admin-command-content">

    <section id="branding" className="admin-panel branding-panel"><div className="section-heading"><div><p className="eyebrow">Nhận diện bệnh viện</p><h2>Tên và màu dùng trên toàn hệ thống</h2></div><span>Header · đăng nhập · báo cáo</span></div>
      <BrandingForm branding={branding} action={saveBrandingAction}/>
    </section>

    <section id="settings" className="admin-panel"><div className="section-heading"><div><p className="eyebrow">Cài đặt vận hành</p><h2>Áp dụng cho các luồng nghiệp vụ</h2></div><span>Giờ chốt · Sonde · Kho</span></div>
      <SettingsForm settings={{ advanceEntryDays: settings.advanceEntryDays, serviceCompletionMinutes: settings.serviceCompletionMinutes, publicMenuImages: settings.publicMenuImages, publicViewCountVisible: settings.publicViewCountVisible, sondeEnabled: settings.sondeEnabled, warehouseMode: settings.warehouseMode, warehouseApprovalRole: settings.warehouseApprovalRole as "ADMIN" | "DIETITIAN" | "KITCHEN" }} mealTypes={mealTypes.filter((meal) => meal.status === "ACTIVE")} action={saveSettingsAction}/>
    </section>

    <section id="meal-types" className="admin-panel"><div className="section-heading"><div><p className="eyebrow">Bữa ăn</p><h2>Danh mục giờ phục vụ</h2></div><span>Tạo · sửa · vô hiệu hóa</span></div>
      <details className="admin-create-drawer"><summary><span><strong>Tạo bữa ăn mới</strong><small>Thêm phụ sáng, phụ chiều, tối hoặc ăn đêm theo vận hành thực tế</small></span><em>Mở biểu mẫu</em></summary><div className="admin-create-body"><form action={saveMealTypeAction} className="admin-grid"><label>Mã<input name="code" pattern="[A-Za-z0-9_-]{2,20}" autoComplete="off" spellCheck={false} required/></label><label>Tên bữa<input name="name" autoComplete="off" required/></label><label>Giờ chốt<input name="cutoffTime" type="time" required/></label><label>Giờ phục vụ<input name="serviceTime" type="time" required/></label><label>Thứ tự<input name="sortOrder" type="number" min="0" max="999" defaultValue="0" required/></label><button className="primary-action">Tạo bữa ăn</button></form></div></details>
      <MealTypeTable saveAction={saveMealTypeAction} statusAction={mealTypeStatusAction} data={mealTypes.map((meal) => ({ id: meal.id, code: meal.code, name: meal.name, cutoffTime: meal.cutoffTime, serviceTime: meal.serviceTime, sortOrder: meal.sortOrder, status: meal.status, statusLabel: meal.status === "ACTIVE" ? "Đang dùng" : "Đã vô hiệu" }))}/>
    </section>

    <section id="accounts" className="admin-panel"><div className="section-heading"><div><p className="eyebrow">Nhân sự & tài khoản</p><h2>Danh sách người dùng</h2></div><span>{activeUsers} hoạt động · {users.length - activeUsers} vô hiệu</span></div>
      <details className="admin-create-drawer"><summary><span><strong>Tạo tài khoản mới</strong><small>Chỉ mở biểu mẫu khi cần thêm nhân sự</small></span><em>Mở biểu mẫu</em></summary><div className="admin-create-body"><AccountCreateForm departments={departments} action={saveAccountAction}/></div></details>
      <AccountTable departments={departments} saveAction={saveAccountAction} statusAction={accountStatusAction} data={users.map((account) => ({ id: account.id, name: account.displayName, email: account.email, role: account.role, roleLabel: roleLabel[account.role], departmentId: account.memberships[0]?.departmentId ?? "", department: account.memberships[0]?.department.name ?? "—", status: account.status, statusLabel: account.status === "ACTIVE" ? "Đang hoạt động" : "Đã vô hiệu" }))}/>
    </section>

    <section id="diet-types" className="admin-panel"><div className="section-heading"><div><p className="eyebrow">Mã chế độ / quy định</p><h2>Danh mục chế độ ăn</h2></div><span>Vô hiệu hóa, không xóa lịch sử</span></div>
      <details className="admin-create-drawer"><summary><span><strong>Tạo mã chế độ mới</strong><small>Thêm khi bệnh viện bắt đầu áp dụng một chế độ mới</small></span><em>Mở biểu mẫu</em></summary><div className="admin-create-body"><form action={saveDietTypeAction} className="admin-grid diet-create"><label>Mã<input name="code" pattern="[A-Za-z0-9_-]{2,20}" autoComplete="off" spellCheck={false} required/></label><label>Tên chế độ<input name="name" autoComplete="off" required/></label><label>Đường nuôi<select name="feedingRoute"><option value="NORMAL">Ăn thường</option><option value="SONDE">Sonde</option></select></label><label>Quy định dinh dưỡng<select name="dietCodeRefId"><option value="">—</option>{dietCodes.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></label><label>Thứ tự<input name="sortOrder" type="number" min="0" max="999" defaultValue="0" required/></label><button className="primary-action">Tạo mã chế độ</button></form></div></details>
      <DietTypeTable dietCodes={dietCodes} saveAction={saveDietTypeAction} statusAction={dietTypeStatusAction} data={dietTypes.map((diet) => ({ id: diet.id, code: diet.code, name: diet.name, feedingRoute: diet.feedingRoute, routeLabel: diet.feedingRoute === "SONDE" ? "Sonde" : "Ăn thường", dietCodeRefId: diet.dietCodeRefId ?? "", dietCode: diet.dietCodeRef?.code ?? "—", sortOrder: diet.sortOrder, status: diet.status, statusLabel: diet.status === "ACTIVE" ? "Đang dùng" : "Đã vô hiệu" }))}/>
    </section>
    </div></div>
  </main></AppShell>;
}
