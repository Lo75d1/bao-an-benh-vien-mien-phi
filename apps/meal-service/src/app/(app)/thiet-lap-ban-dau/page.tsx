import { redirect } from "next/navigation";
import { AccountCreateForm } from "../quan-tri/admin-forms";
import { AccountTable } from "../quan-tri/account-table";
import { DepartmentTable } from "../quan-tri/department-table";
import { DietTypeTable } from "../quan-tri/diet-type-table";
import { MealTypeTable } from "../quan-tri/meal-type-table";
import { getSessionUser } from "@/lib/auth";
import { readBrandingSettings } from "@/lib/branding";
import { readSetupCompletion, readSetupInventory, validateSetupInventory } from "@/lib/first-time-setup";
import { prisma } from "@/lib/prisma";
import { readOperationalSettings } from "@/lib/settings";
import { completeSetupAction, setupAccountAction, setupAccountStatusAction, setupBrandingAction, setupDepartmentAction, setupDepartmentStatusAction, setupDietTypeAction, setupDietTypeStatusAction, setupMealTypeAction, setupMealTypeStatusAction, setupRouteAction } from "./actions";

const STEPS = ["Bệnh viện", "Khoa/phòng", "Tài khoản", "Đường nuôi", "Chế độ ăn", "Bữa/cữ", "Kiểm tra"];
const roleLabel = { ADMIN: "Quản trị", DIETITIAN: "Dinh dưỡng", NURSE: "Điều dưỡng", KITCHEN: "Nhà bếp" } as const;

function Navigation({ step }: { step: number }) {
  return <div className="setup-navigation">{step > 1 ? <a className="secondary-button" href={`/thiet-lap-ban-dau?step=${step - 1}`}>← Quay lại</a> : <span/>}{step < 7 ? <a className="primary-action" href={`/thiet-lap-ban-dau?step=${step + 1}`}>Tiếp tục →</a> : null}</div>;
}

export default async function FirstTimeSetupPage({ searchParams }: { searchParams: Promise<{ step?: string; error?: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/");
  if (user.role !== "ADMIN") redirect("/");
  if (user.mustChangePassword) redirect("/ho-so?first=1");
  if (await readSetupCompletion()) redirect("/quan-ly");
  const query = await searchParams;
  const step = Math.min(7, Math.max(1, Number(query.step) || 1));
  const [branding, settings, departments, users, dietTypes, dietCodes, mealTypes, inventory] = await Promise.all([
    readBrandingSettings(), readOperationalSettings(),
    prisma.department.findMany({ orderBy: { code: "asc" } }),
    prisma.user.findMany({ orderBy: { displayName: "asc" }, include: { memberships: { include: { department: true } } } }),
    prisma.dietType.findMany({ orderBy: [{ feedingRoute: "asc" }, { sortOrder: "asc" }], include: { dietCodeRef: { select: { id: true, code: true, name: true } } } }),
    prisma.dietCode.findMany({ orderBy: { code: "asc" }, select: { id: true, code: true, name: true } }),
    prisma.mealType.findMany({ orderBy: [{ feedingRoute: "asc" }, { sortOrder: "asc" }] }),
    readSetupInventory(user.id),
  ]);
  const issues = validateSetupInventory(inventory);
  const activeDepartments = departments.filter((item) => item.status === "ACTIVE");
  return <main className="setup-page">
    <header className="setup-header"><div className="setup-brand-mark">{branding.shortName}</div><div><p>Thiết lập lần đầu</p><h1>{branding.organizationName}</h1><span>Hoàn thiện 7 bước để bắt đầu vận hành suất ăn.</span></div></header>
    <nav className="setup-stepper" aria-label="Các bước thiết lập">{STEPS.map((label, index) => <a key={label} href={`/thiet-lap-ban-dau?step=${index + 1}`} className={index + 1 === step ? "is-active" : index + 1 < step ? "is-done" : ""}><b>{index + 1}</b><span>{label}</span></a>)}</nav>
    {query.error ? <div className="setup-error" role="alert"><strong>Chưa thể lưu</strong><span>{query.error}</span></div> : null}
    <section className="setup-card">
      {step === 1 ? <><header><p>Bước 1</p><h2>Thông tin bệnh viện</h2><span>Xác nhận tên và nhận diện dùng chung trên toàn hệ thống.</span></header><form action={setupBrandingAction} className="setup-form setup-branding-form"><label>Tên đơn vị/bệnh viện<input name="organizationName" defaultValue={branding.organizationName} minLength={2} maxLength={100} required/></label><label>Tên viết tắt<input name="shortName" defaultValue={branding.shortName} minLength={1} maxLength={5} required/></label><label>Màu nhận diện<input name="primaryColor" type="color" defaultValue={branding.primaryColor}/></label><button className="primary-action">Lưu và tiếp tục</button></form></> : null}
      {step === 2 ? <><header><p>Bước 2</p><h2>Khoa/phòng</h2><span>Giữ, sửa hoặc vô hiệu hóa dữ liệu mẫu; thêm đủ khoa đang sử dụng thực tế.</span></header><form action={setupDepartmentAction} className="admin-grid department-create"><label>Mã khoa<input name="code" pattern="[A-Za-z0-9_-]{2,20}" required/></label><label>Tên khoa<input name="name" required/></label><button className="primary-action">Thêm khoa</button></form><DepartmentTable saveAction={setupDepartmentAction} statusAction={setupDepartmentStatusAction} data={departments.map((item) => ({ ...item, statusLabel: item.status === "ACTIVE" ? "Đang dùng" : "Đã vô hiệu" }))}/><Navigation step={step}/></> : null}
      {step === 3 ? <><header><p>Bước 3</p><h2>Tài khoản và phân quyền</h2><span>Điều dưỡng phải gắn khoa; tài khoản Bếp phải chọn đúng phạm vi NORMAL hoặc Sonde.</span></header><AccountCreateForm departments={activeDepartments} action={setupAccountAction}/><AccountTable departments={activeDepartments} saveAction={setupAccountAction} statusAction={setupAccountStatusAction} data={users.map((account) => ({ id: account.id, name: account.displayName, email: account.email, role: account.role, roleLabel: roleLabel[account.role], departmentId: account.memberships[0]?.departmentId ?? "", department: account.memberships[0]?.department.name ?? "—", kitchenRoute: account.kitchenRoute ?? "", kitchenScope: account.role === "KITCHEN" ? account.kitchenRoute === "SONDE" ? "Bếp Sonde" : "Bếp ăn thường" : "—", status: account.status, statusLabel: account.status === "ACTIVE" ? "Đang hoạt động" : "Đã vô hiệu" }))}/><Navigation step={step}/></> : null}
      {step === 4 ? <><header><p>Bước 4</p><h2>Đường nuôi</h2><span>Ăn thường là luồng mặc định. Sonde có lịch, mã ăn và tài khoản Bếp độc lập.</span></header><form action={setupRouteAction} className="setup-route-form"><div className="setup-route is-required"><strong>✓ Ăn thường (NORMAL)</strong><span>Luôn bật · luồng vận hành nền của hệ thống</span></div><label className="setup-route"><input type="checkbox" name="sondeEnabled" defaultChecked={settings.sondeEnabled}/><span><strong>Đường nuôi Sonde</strong><small>Bật khi bệnh viện có cữ Sonde và Bếp Sonde riêng.</small></span></label><button className="primary-action">Lưu và tiếp tục</button></form></> : null}
      {step === 5 ? <><header><p>Bước 5</p><h2>Mã chế độ ăn</h2><span>Dữ liệu seed là gợi ý; Admin quyết định mã nào được sử dụng.</span></header><form action={setupDietTypeAction} className="admin-grid diet-create"><label>Mã<input name="code" pattern="[A-Za-z0-9_-]{2,20}" required/></label><label>Tên chế độ<input name="name" required/></label><label>Đường nuôi<select name="feedingRoute"><option value="NORMAL">Ăn thường</option><option value="SONDE">Sonde</option></select></label><label>Quy định<select name="dietCodeRefId"><option value="">—</option>{dietCodes.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></label><label>Thứ tự<input name="sortOrder" type="number" min="0" max="999" defaultValue="0" required/></label><button className="primary-action">Thêm mã</button></form><DietTypeTable dietCodes={dietCodes} saveAction={setupDietTypeAction} statusAction={setupDietTypeStatusAction} data={dietTypes.map((item) => ({ id: item.id, code: item.code, name: item.name, feedingRoute: item.feedingRoute, routeLabel: item.feedingRoute === "SONDE" ? "Sonde" : "Ăn thường", dietCodeRefId: item.dietCodeRefId ?? "", dietCode: item.dietCodeRef?.code ?? "—", sortOrder: item.sortOrder, status: item.status, statusLabel: item.status === "ACTIVE" ? "Đang dùng" : "Đã vô hiệu" }))}/><Navigation step={step}/></> : null}
      {step === 6 ? <><header><p>Bước 6</p><h2>Bữa ăn và cữ ăn</h2><span>Không giới hạn số bữa. Mỗi bữa có giờ chốt trước giờ phục vụ.</span></header><form action={setupMealTypeAction} className="admin-grid"><label>Đường nuôi<select name="feedingRoute"><option value="NORMAL">Ăn thường</option><option value="SONDE">Sonde</option></select></label><label>Mã<input name="code" pattern="[A-Za-z0-9_-]{2,20}" required/></label><label>Tên bữa/cữ<input name="name" required/></label><label>Giờ chốt<input name="cutoffTime" type="time" required/></label><label>Giờ phục vụ<input name="serviceTime" type="time" required/></label><label>Thứ tự<input name="sortOrder" type="number" min="0" max="999" defaultValue="0" required/></label><button className="primary-action">Thêm bữa/cữ</button></form><MealTypeTable saveAction={setupMealTypeAction} statusAction={setupMealTypeStatusAction} data={mealTypes.map((item) => ({ ...item, routeLabel: item.feedingRoute === "SONDE" ? "Cữ Sonde" : "Ăn thường", statusLabel: item.status === "ACTIVE" ? "Đang dùng" : "Đã vô hiệu" }))}/><Navigation step={step}/></> : null}
      {step === 7 ? <><header><p>Bước 7</p><h2>Kiểm tra và hoàn tất</h2><span>Hệ thống chỉ đánh dấu hoàn tất sau khi kiểm tra lại dữ liệu và tạo lịch vận hành thành công.</span></header><div className="setup-summary"><article><span>Bệnh viện</span><strong>{branding.organizationName}</strong></article><article><span>Khoa hoạt động</span><strong>{inventory.activeDepartments}</strong></article><article><span>Điều dưỡng đã gắn khoa</span><strong>{inventory.activeNursesWithDepartment}</strong></article><article><span>Bếp NORMAL / Sonde</span><strong>{inventory.activeKitchenByRoute.NORMAL} / {inventory.activeKitchenByRoute.SONDE}</strong></article><article><span>Mã ăn NORMAL / Sonde</span><strong>{inventory.activeDietTypesByRoute.NORMAL} / {inventory.activeDietTypesByRoute.SONDE}</strong></article><article><span>Bữa NORMAL / cữ Sonde</span><strong>{inventory.activeMealTypesByRoute.NORMAL} / {inventory.activeMealTypesByRoute.SONDE}</strong></article><article><span>Sonde</span><strong>{inventory.sondeEnabled ? "Đang bật" : "Đang tắt"}</strong></article></div>{issues.length ? <div className="setup-checklist is-invalid"><strong>Cần hoàn thiện {issues.length} mục</strong><ul>{issues.map((item) => <li key={item.code}>{item.message}</li>)}</ul></div> : <div className="setup-checklist is-valid"><strong>✓ Đã đủ điều kiện vận hành</strong><span>Khi hoàn tất, hệ thống sẽ tạo lịch tuần hiện tại và chuyển tới Điều hành.</span></div>}<div className="setup-navigation"><a className="secondary-button" href="/thiet-lap-ban-dau?step=6">← Quay lại</a><form action={completeSetupAction}><button className="primary-action" disabled={issues.length > 0}>Hoàn tất thiết lập →</button></form></div></> : null}
    </section>
  </main>;
}
