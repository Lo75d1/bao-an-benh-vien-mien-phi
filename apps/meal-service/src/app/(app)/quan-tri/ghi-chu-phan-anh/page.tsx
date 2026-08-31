import type { PatientSubmissionStatus, PatientSubmissionType } from "@prisma/client";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSessionUser } from "@/lib/auth";
import { readPatientSubmissions } from "@/lib/patient-note";
import { prisma } from "@/lib/prisma";
import { updatePatientSubmissionAction } from "./actions";

const TYPE_LABEL: Record<PatientSubmissionType, string> = { MEAL_NOTE: "Ghi chú bữa ăn", FEEDBACK: "Phản ánh" };
const STATUS_LABEL: Record<PatientSubmissionStatus, string> = { NEW: "Mới tiếp nhận", IN_PROGRESS: "Đang xử lý", FORWARDED_TO_KITCHEN: "Đã chuyển Bếp", RESOLVED: "Đã xử lý", REJECTED: "Từ chối" };
const dateLabel = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric" });
const dateTimeLabel = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

function hiddenFilters(type: string, status: string, departmentId: string) {
  return <><input type="hidden" name="filterType" value={type}/><input type="hidden" name="filterStatus" value={status}/><input type="hidden" name="filterDepartment" value={departmentId}/></>;
}

export default async function PatientSubmissionAdminPage({ searchParams }: { searchParams: Promise<{ type?: string; status?: string; departmentId?: string; updated?: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/");
  if (user.role !== "ADMIN") redirect("/");
  const query = await searchParams;
  const type = query.type === "MEAL_NOTE" || query.type === "FEEDBACK" ? query.type : "ALL";
  const status = ["NEW", "IN_PROGRESS", "FORWARDED_TO_KITCHEN", "RESOLVED", "REJECTED"].includes(query.status ?? "") ? query.status as PatientSubmissionStatus : "ALL";
  const departmentId = typeof query.departmentId === "string" ? query.departmentId : "";
  const [departments, submissions] = await Promise.all([
    prisma.department.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    readPatientSubmissions({ type: type as PatientSubmissionType | "ALL", status, departmentId: departmentId || undefined }),
  ]);

  return <AppShell user={user}><main className="admin-workspace patient-submission-admin">
    <header className="admin-hero"><p className="eyebrow">Admin</p><h1>Ghi chú & phản ánh</h1><p>Theo dõi nội dung người bệnh/người nhà gửi. Ghi chú bữa ăn chỉ chuyển tới Bếp sau khi Khoa hoặc Admin kiểm tra.</p></header>
    {query.updated ? <p className="patient-form-success" role="status">Đã cập nhật trạng thái và ghi AuditLog.</p> : null}
    <form className="patient-submission-filters" method="get">
      <label>Loại<select name="type" defaultValue={type}><option value="ALL">Tất cả</option><option value="MEAL_NOTE">Ghi chú bữa ăn</option><option value="FEEDBACK">Phản ánh</option></select></label>
      <label>Trạng thái<select name="status" defaultValue={status}><option value="ALL">Tất cả</option>{Object.entries(STATUS_LABEL).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label>Khoa<select name="departmentId" defaultValue={departmentId}><option value="">Tất cả khoa</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label>
      <button className="secondary-button" type="submit">Lọc</button>
    </form>
    <section className="patient-submission-list" aria-label="Danh sách ghi chú và phản ánh">
      {!submissions.length ? <p className="empty-state">— · Không có nội dung phù hợp bộ lọc.</p> : submissions.map((item) => <article key={item.id} className="patient-submission-card">
        <header><div><span className={`submission-type ${item.type.toLowerCase()}`}>{TYPE_LABEL[item.type]}</span><h2>{item.department.name}</h2></div><span className={`submission-status ${item.submissionStatus.toLowerCase()}`}>{STATUS_LABEL[item.submissionStatus]}</span></header>
        <p>{item.note}</p>
        <dl><div><dt>Ngày/bữa</dt><dd>{dateLabel.format(item.mealDate)}{item.mealEvent?.mealType.name ? ` · ${item.mealEvent.mealType.name}` : ""}</dd></div><div><dt>Người gửi</dt><dd>{item.contactName || "Không ghi tên"}{item.contactInfo ? ` · ${item.contactInfo}` : ""}</dd></div><div><dt>Gửi lúc</dt><dd>{dateTimeLabel.format(item.createdAt)}</dd></div><div><dt>Nơi nhận</dt><dd>Admin · Khoa theo cấu hình · Dinh dưỡng theo cấu hình</dd></div></dl>
        {item.reviewNote ? <aside><strong>Ghi chú xử lý</strong><p>{item.reviewNote}</p></aside> : null}
        <form action={updatePatientSubmissionAction} className="patient-submission-actions">
          <input type="hidden" name="id" value={item.id}/>{hiddenFilters(type, status, departmentId)}
          <input name="note" maxLength={100} placeholder="Ghi chú xử lý nếu cần"/>
          {item.submissionStatus === "NEW" ? <button name="action" value="ACCEPT" className="secondary-button">Tiếp nhận</button> : null}
          {item.submissionStatus !== "RESOLVED" && item.submissionStatus !== "REJECTED" ? <button name="action" value="IN_PROGRESS" className="secondary-button">Đang xử lý</button> : null}
          {item.type === "MEAL_NOTE" && item.submissionStatus !== "FORWARDED_TO_KITCHEN" && item.submissionStatus !== "RESOLVED" && item.submissionStatus !== "REJECTED" ? <button name="action" value="FORWARD_TO_KITCHEN" className="primary-action">Chuyển Bếp</button> : null}
          {item.submissionStatus !== "RESOLVED" ? <button name="action" value="RESOLVE" className="primary-action">Đã xử lý</button> : null}
          {item.submissionStatus !== "REJECTED" ? <button name="action" value="REJECT" className="secondary-button danger-action">Từ chối</button> : null}
        </form>
      </article>)}
    </section>
  </main></AppShell>;
}
