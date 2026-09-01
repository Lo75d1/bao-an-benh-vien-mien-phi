import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSessionUser } from "@/lib/auth";
import {
  publicSubmissionAttachmentUrl,
  readVisiblePatientSubmissions,
} from "@/lib/patient-note";
import { updatePatientSubmissionAction } from "./actions";
import { normalizeLanguage } from "@/lib/i18n";
import { SUBMISSION_TEXT } from "./catalog";

export default async function PatientSubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    type?: "FEEDBACK" | "KITCHEN_NOTE" | "ALL";
    status?: "RECEIVED" | "APPROVED" | "REJECTED" | "ALL";
  }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/");
  if (user.role !== "ADMIN" && user.role !== "DIETITIAN") redirect("/");
  const language = normalizeLanguage(user.language);
  const t = SUBMISSION_TEXT[language];
  const dateTime = new Intl.DateTimeFormat(language === "en" ? "en-US" : "vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "short" });
  const query = await searchParams;
  const type =
    query.type === "FEEDBACK" || query.type === "KITCHEN_NOTE"
      ? query.type
      : "ALL";
  const status =
    query.status === "RECEIVED" ||
    query.status === "APPROVED" ||
    query.status === "REJECTED"
      ? query.status
      : "ALL";
  const rows = await readVisiblePatientSubmissions(user.role, { type, status });
  const pending = rows.filter((row) => row.status === "RECEIVED").length;
  return (
    <AppShell user={user}>
      <main className="workspace patient-submissions-page">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">{t.eyebrow}</p>
            <h1>{t.title}</h1>
            <span>
              {pending > 0
                ? t.pending(pending)
                : t.nonePending}
            </span>
          </div>
        </header>
        <form method="get" className="report-scope-bar">
          <label>
            {t.type}
            <select name="type" defaultValue={type}>
              <option value="ALL">{t.all}</option>
              <option value="FEEDBACK">{t.types.FEEDBACK}</option>
              <option value="KITCHEN_NOTE">{t.types.KITCHEN_NOTE}</option>
            </select>
          </label>
          <label>
            {t.status}
            <select name="status" defaultValue={status}>
              <option value="ALL">{t.all}</option>
              <option value="RECEIVED">{t.statuses.RECEIVED}</option>
              <option value="APPROVED">{t.statuses.APPROVED}</option>
              <option value="REJECTED">{t.statuses.REJECTED}</option>
            </select>
          </label>
          <button type="submit" className="secondary-button">
            {t.filter}
          </button>
        </form>
        <section className="admin-card">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>{t.type}</th>
                  <th>{t.department}</th>
                  <th>{t.content}</th>
                  <th>{t.contact}</th>
                  <th>{t.attachment}</th>
                  <th>{t.time}</th>
                  <th>{t.status}</th>
                  <th>{t.handling}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{t.types[row.type]}</td>
                    <td>{row.department.name}</td>
                    <td>
                      {row.note}
                      {row.reviewNote ? (
                        <small> · {row.reviewNote}</small>
                      ) : null}
                    </td>
                    <td>
                      {row.contactName ?? "—"}
                      {row.contactInfo ? " · " + row.contactInfo : ""}
                    </td>
                    <td>
                      {row.attachmentPath ? (
                        <a
                          href={publicSubmissionAttachmentUrl(row.id)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {t.viewImage}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>{dateTime.format(row.createdAt)}</td>
                    <td>{t.statuses[row.status]}</td>
                    <td>
                      {row.status === "RECEIVED" ? (
                        <form
                          action={updatePatientSubmissionAction}
                          className="inline-actions"
                        >
                          <input type="hidden" name="id" value={row.id} />
                          <input
                            name="reviewNote"
                            maxLength={100}
                            placeholder={t.reviewPlaceholder}
                          />
                          <button
                            name="status"
                            value="APPROVED"
                            className="primary-action"
                          >
                            {row.type === "KITCHEN_NOTE"
                              ? t.forwardKitchen
                              : t.handled}
                          </button>
                          <button
                            name="status"
                            value="REJECTED"
                            className="secondary-button"
                          >
                            {t.reject}
                          </button>
                        </form>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </AppShell>
  );
}
