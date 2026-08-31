import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSessionUser } from "@/lib/auth";
import { publicSubmissionAttachmentUrl, readVisiblePatientSubmissions } from "@/lib/patient-note";
import { updatePatientSubmissionAction } from "./actions";

const TYPE_LABEL = { FEEDBACK: "Phản ánh", KITCHEN_NOTE: "Ghi chú Bếp" } as const;
const STATUS_LABEL = { RECEIVED: "Chưa xử lý", APPROVED: "Đã xử lý/chuyển Bếp", REJECTED: "Từ chối" } as const;
const dateTime = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "short" });

export default async function PatientSubmissionsPage({ searchParams }: { searchParams: Promise<{ type?: "FEEDBACK" | "KITCHEN_NOTE" | "ALL"; status?: "RECEIVED" | "APPROVED" | "REJECTED" | "ALL" }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/");
  if (user.role !== "ADMIN" && user.role !== "DIETITIAN") redirect("/");
  const query = await searchParams;
  const type = query.type === "FEEDBACK" || query.type === "KITCHEN_NOTE" ? query.type : "ALL";
  const status = query.status === "RECEIVED" || query.status === "APPROVED" || query.status === "REJECTED" ? query.status : "ALL";
  const rows = await readVisiblePatientSubmissions(user.role, { type, status });
  const pending = rows.filter((row) => row.status === "RECEIVED").length;
  return <AppShell user={user}><main className="workspace patient-submissions-page">
    <header className="workspace-header"><div><p className="eyebrow">Public</p><h1>Phản ánh & Ghi chú Bếp</h1><span>{pending > 0 ? pending + " nội dung chưa xử lý" : "Không có nội dung chờ xử lý"}</span></div></header>
    <form method="get" className="report-scope-bar"><label>Loại<select name="type" defaultValue={type}><option value="ALL">Tất cả</option><option value="FEEDBACK">Phản ánh</option><option value="KITCHEN_NOTE">Ghi chú Bếp</option></select></label><label>Trạng thái<select name="status" defaultValue={status}><option value="ALL">Tất cả</option><option value="RECEIVED">Chưa xử lý</option><option value="APPROVED">Đã xử lý/chuyển Bếp</option><option value="REJECTED">Từ chối</option></select></label><button type="submit" className="secondary-button">Lọc</button></form>
    <section className="admin-card"><div className="table-scroll"><table><thead><tr><th>Loại</th><th>Khoa</th><th>Nội dung</th><th>Liên hệ</th><th>Đính kèm</th><th>Thời gian</th><th>Trạng thái</th><th>Xử lý</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td>{TYPE_LABEL[row.type]}</td><td>{row.department.name}</td><td>{row.note}{row.reviewNote ? <small> · {row.reviewNote}</small> : null}</td><td>{row.contactName ?? "—"}{row.contactInfo ? " · " + row.contactInfo : ""}</td><td>{row.attachmentPath ? <a href={publicSubmissionAttachmentUrl(row.id)} target="_blank" rel="noreferrer">Xem ảnh</a> : "—"}</td><td>{dateTime.format(row.createdAt)}</td><td>{STATUS_LABEL[row.status]}</td><td>{row.status === "RECEIVED" ? <form action={updatePatientSubmissionAction} className="inline-actions"><input type="hidden" name="id" value={row.id}/><input name="reviewNote" maxLength={100} placeholder="Ghi chú xử lý"/><button name="status" value="APPROVED" className="primary-action">{row.type === "KITCHEN_NOTE" ? "Chuyển Bếp" : "Đã xử lý"}</button><button name="status" value="REJECTED" className="secondary-button">Từ chối</button></form> : "—"}</td></tr>)}</tbody></table></div></section>
  </main></AppShell>;
}
