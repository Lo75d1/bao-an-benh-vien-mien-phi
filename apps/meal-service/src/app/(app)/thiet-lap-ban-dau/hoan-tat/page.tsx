import { redirect } from "next/navigation";
import { readBootstrapState } from "@/lib/bootstrap-setup";
import { readSetupCompletion } from "@/lib/first-time-setup";
import { readBrandingSettings } from "@/lib/branding";
import { normalizeLanguage } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function SetupCompletedPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const language = normalizeLanguage((await searchParams).lang);
  const en = language === "en";
  const l = (vi: string, english: string) => en ? english : vi;
  const [completion, bootstrap, branding] = await Promise.all([readSetupCompletion(), readBootstrapState(), readBrandingSettings()]);
  if (!completion || bootstrap?.adminId !== completion.completedById) redirect("/");
  return <main className="setup-page"><section className="setup-card setup-completed"><header><p>{l("Khởi tạo thành công", "Setup complete")}</p><h1>{branding.organizationName}</h1><span>{l("Lịch vận hành đã được tạo. Cổng bootstrap đã khóa và không thể tạo thêm Admin trái phép.", "The operating schedule has been created. The bootstrap portal is locked and cannot create unauthorized admins.")}</span></header><div className="setup-checklist is-valid"><strong>✓ {l("Hệ thống sẵn sàng", "System ready")}</strong><span>{l("File XLSX có mật khẩu tạm vừa được tải một lần. Nếu thất lạc, Admin phải đặt lại mật khẩu mới cho từng tài khoản.", "The XLSX containing temporary passwords was downloaded once. If it is lost, an admin must reset each account password.")}</span></div><div className="setup-handoff-downloads"><a className="primary-action" href="/api/setup/handoff/docx">{l("Tải DOCX · Hồ sơ bàn giao", "Download DOCX · Handoff record")}</a><a className="secondary-button" href="/api/setup/handoff/xlsx">{l("Tải XLSX · Danh sách IT (không mật khẩu)", "Download XLSX · IT list (no passwords)")}</a></div><p>{l("DOCX và XLSX này lấy từ dữ liệu đã lưu trong hệ thống. Không tệp nào chứa password hash.", "These DOCX and XLSX files use data saved in the system. Neither file contains password hashes.")}</p><a className="primary-action" href={`/?lang=${language}`}>{l("Đến trang chủ & đăng nhập", "Go to home & sign in")} →</a></section></main>;
}
