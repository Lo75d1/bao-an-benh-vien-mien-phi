import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSessionUser } from "@/lib/auth";
import { readPatientSubmissions } from "@/lib/patient-note";
import { updatePatientSubmissionAction } from "./actions";

const TYPE_LABEL = { FEEDBACK: "Ph?n ?nh", KITCHEN_NOTE: "Ghi ch? B?p" } as const;
const STATUS_LABEL = { RECEIVED: "Ch?a x? l?", APPROVED: "?? x? l?/chuy?n B?p", REJECTED: "T? ch?i" } as const;
const dateTime = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "short" });

export default async function PatientSubmissionsPage({ searchParams }: { searchParams: Promise<{ type?: "FEEDBACK" | "KITCHEN_NOTE" | "ALL"; status?: "RECEIVED" | "APPROVED" | "REJECTED" | "ALL" }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/");
  if (user.role !== "ADMIN" && user.role !== "DIETITIAN") redirect("/");
  const query = await searchParams;
  const type = query.type === "FEEDBACK" || query.type === "KITCHEN_NOTE" ? query.type : "ALL";
  const status = query.status === "RECEIVED" || query.status === "APPROVED" || query.status === "REJECTED" ? query.status : "ALL";
  const rows = await readPatientSubmissions({ type, status });
  const pending = rows.filter((row) => row.status === "RECEIVED").length;
  return <AppShell user={user}><main className="workspace patient-submissions-page">
    <header className="workspace-header"><div><p className="eyebrow">Public</p><h1>Ph?n ?nh & Ghi ch? B?p</h1><span>{pending > 0 ? pending + " n?i dung ch?a x? l?" : "Kh?ng c? n?i dung ch? x? l?"}</span></div></header>
    <form method="get" className="report-scope-bar"><label>Lo?i<select name="type" defaultValue={type}><option value="ALL">T?t c?</option><option value="FEEDBACK">Ph?n ?nh</option><option value="KITCHEN_NOTE">Ghi ch? B?p</option></select></label><label>Tr?ng th?i<select name="status" defaultValue={status}><option value="ALL">T?t c?</option><option value="RECEIVED">Ch?a x? l?</option><option value="APPROVED">?? x? l?/chuy?n B?p</option><option value="REJECTED">T? ch?i</option></select></label><button type="submit" className="secondary-button">L?c</button></form>
    <section className="admin-card"><div className="table-scroll"><table><thead><tr><th>Lo?i</th><th>Khoa</th><th>N?i dung</th><th>Li?n h?</th><th>Th?i gian</th><th>Tr?ng th?i</th><th>X? l?</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td>{TYPE_LABEL[row.type]}</td><td>{row.department.name}</td><td>{row.note}{row.reviewNote ? <small> ? {row.reviewNote}</small> : null}</td><td>{row.contactName ?? "?"}{row.contactInfo ? " ? " + row.contactInfo : ""}</td><td>{dateTime.format(row.createdAt)}</td><td>{STATUS_LABEL[row.status]}</td><td>{row.status === "RECEIVED" ? <form action={updatePatientSubmissionAction} className="inline-actions"><input type="hidden" name="id" value={row.id}/><input name="reviewNote" maxLength={100} placeholder="Ghi ch? x? l?"/><button name="status" value="APPROVED" className="primary-action">{row.type === "KITCHEN_NOTE" ? "Chuy?n B?p" : "?? x? l?"}</button><button name="status" value="REJECTED" className="secondary-button">T? ch?i</button></form> : "?"}</td></tr>)}</tbody></table></div></section>
  </main></AppShell>;
}
