import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/presentation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readOperationalSettings } from "@/lib/settings";
import { accountStatusAction, dietTypeStatusAction, saveAccountAction, saveDietTypeAction, saveSettingsAction } from "./actions";

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
      <form action={saveSettingsAction} className="admin-form"><div className="admin-grid">
        <label>Số ngày được nhập trước<input name="advanceEntryDays" type="number" min="1" max="60" defaultValue={settings.advanceEntryDays} required/></label>
        <label className="check-field"><input name="sondeEnabled" type="checkbox" defaultChecked={settings.sondeEnabled}/><span>Bật đường nuôi Sonde</span></label>
        <label>Mode kho<select name="warehouseMode" defaultValue={settings.warehouseMode}><option value="A">Mode A · một kho tổng</option><option value="B">Mode B · kho bếp + kho sonde</option></select></label>
        <label>Role duyệt kho<select name="warehouseApprovalRole" defaultValue={settings.warehouseApprovalRole}><option value="ADMIN">Quản trị</option><option value="DIETITIAN">Dinh dưỡng</option><option value="KITCHEN">Nhà bếp</option></select></label>
      </div><div className="meal-time-grid">{mealTypes.map((meal) => <fieldset key={meal.id}><legend>{meal.name}</legend><input type="hidden" name="mealTypeId" value={meal.id}/><label>Giờ chốt<input name="cutoffTime" type="time" defaultValue={meal.cutoffTime} required/></label><label>Giờ ăn<input name="serviceTime" type="time" defaultValue={meal.serviceTime} required/></label></fieldset>)}</div>
      <div className="admin-submit"><label>Lý do thay đổi<input name="reason" minLength={3} maxLength={500} required placeholder="Nêu lý do để lưu AuditLog"/></label><button className="primary-action">Áp dụng cấu hình</button></div></form>
    </section>

    <section id="accounts" className="admin-panel"><div className="section-heading"><div><p className="eyebrow">Nhân sự & tài khoản</p><h2>Tạo tài khoản mới</h2></div><span>Mật khẩu băm scrypt, không lưu plaintext</span></div>
      <form action={saveAccountAction} className="admin-grid account-create"><label>Họ tên<input name="displayName" minLength={2} maxLength={100} required/></label><label>Email<input name="email" type="email" required/></label><label>Vai trò<select name="role" defaultValue="NURSE"><option value="ADMIN">Quản trị</option><option value="DIETITIAN">Dinh dưỡng</option><option value="NURSE">Điều dưỡng</option><option value="KITCHEN">Nhà bếp</option></select></label><label>Khoa cho điều dưỡng<select name="departmentId"><option value="">—</option>{departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Mật khẩu ban đầu<input name="password" type="password" minLength={10} maxLength={256} autoComplete="new-password" required/></label><button className="primary-action">Tạo tài khoản</button></form>
      <div className="admin-list">{users.map((account) => <details key={account.id}><summary><strong>{account.displayName}</strong><span>{account.email}</span><span>{roleLabel[account.role]}</span><span>{account.memberships[0]?.department.name ?? "—"}</span><span>{account.status === "ACTIVE" ? "Đang hoạt động" : "Đã vô hiệu"}</span></summary><div className="admin-detail"><form action={saveAccountAction} className="admin-grid"><input type="hidden" name="userId" value={account.id}/><label>Họ tên<input name="displayName" defaultValue={account.displayName} required/></label><label>Email<input name="email" type="email" defaultValue={account.email} required/></label><label>Vai trò<select name="role" defaultValue={account.role}>{Object.entries(roleLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Khoa<select name="departmentId" defaultValue={account.memberships[0]?.departmentId ?? ""}><option value="">—</option>{departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Mật khẩu mới (để trống nếu giữ nguyên)<input name="password" type="password" minLength={10} maxLength={256} autoComplete="new-password"/></label><button className="secondary-button">Lưu sửa đổi</button></form><form action={accountStatusAction} className="status-form"><input type="hidden" name="userId" value={account.id}/><input type="hidden" name="status" value={account.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"}/><input name="reason" minLength={3} maxLength={500} required placeholder="Lý do bắt buộc"/><button className={account.status === "ACTIVE" ? "danger-button" : "secondary-button"}>{account.status === "ACTIVE" ? "Vô hiệu hóa" : "Kích hoạt lại"}</button></form></div></details>)}</div>
    </section>

    <section id="diet-types" className="admin-panel"><div className="section-heading"><div><p className="eyebrow">Mã chế độ / quy định</p><h2>Danh mục DietType</h2></div><span>Vô hiệu hóa, không hard-delete</span></div>
      <form action={saveDietTypeAction} className="admin-grid"><label>Mã<input name="code" pattern="[A-Za-z0-9_-]{2,20}" required/></label><label>Tên chế độ<input name="name" required/></label><label>Đường nuôi<select name="feedingRoute"><option value="NORMAL">Ăn thường</option><option value="SONDE">Sonde</option></select></label><label>Quy định dinh dưỡng<select name="dietCodeRefId"><option value="">—</option>{dietCodes.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></label><label>Thứ tự<input name="sortOrder" type="number" min="0" max="999" defaultValue="0" required/></label><button className="primary-action">Tạo mã chế độ</button></form>
      <div className="admin-list">{dietTypes.map((diet) => <details key={diet.id}><summary><strong>{diet.code}</strong><span>{diet.name}</span><span>{diet.feedingRoute === "SONDE" ? "Sonde" : "Ăn thường"}</span><span>{diet.dietCodeRef?.code ?? "—"}</span><span>{diet.status === "ACTIVE" ? "Đang dùng" : "Đã vô hiệu"}</span></summary><div className="admin-detail"><form action={saveDietTypeAction} className="admin-grid"><input type="hidden" name="dietTypeId" value={diet.id}/><label>Mã<input name="code" defaultValue={diet.code} required/></label><label>Tên<input name="name" defaultValue={diet.name} required/></label><label>Đường nuôi<select name="feedingRoute" defaultValue={diet.feedingRoute}><option value="NORMAL">Ăn thường</option><option value="SONDE">Sonde</option></select></label><label>Quy định<select name="dietCodeRefId" defaultValue={diet.dietCodeRefId ?? ""}><option value="">—</option>{dietCodes.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></label><label>Thứ tự<input name="sortOrder" type="number" min="0" max="999" defaultValue={diet.sortOrder}/></label><button className="secondary-button">Lưu sửa đổi</button></form><form action={dietTypeStatusAction} className="status-form"><input type="hidden" name="dietTypeId" value={diet.id}/><input type="hidden" name="active" value={diet.status === "ACTIVE" ? "false" : "true"}/><input name="reason" minLength={3} maxLength={500} required placeholder="Lý do bắt buộc"/><button className={diet.status === "ACTIVE" ? "danger-button" : "secondary-button"}>{diet.status === "ACTIVE" ? "Vô hiệu hóa" : "Kích hoạt lại"}</button></form></div></details>)}</div>
    </section>
  </main></AppShell>;
}
