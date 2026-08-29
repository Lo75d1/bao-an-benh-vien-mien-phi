/* eslint-disable @next/next/no-html-link-for-pages -- setup completion intentionally starts a fresh public navigation */
import { redirect } from "next/navigation";
import { readBootstrapState } from "@/lib/bootstrap-setup";
import { readSetupCompletion } from "@/lib/first-time-setup";
import { readBrandingSettings } from "@/lib/branding";

export const dynamic = "force-dynamic";

export default async function SetupCompletedPage() {
  const [completion, bootstrap, branding] = await Promise.all([readSetupCompletion(), readBootstrapState(), readBrandingSettings()]);
  if (!completion || bootstrap?.adminId !== completion.completedById) redirect("/");
  return <main className="setup-page"><section className="setup-card setup-completed"><header><p>Khởi tạo thành công</p><h1>{branding.organizationName}</h1><span>Lịch vận hành đã được tạo. Cổng bootstrap đã khóa và không thể tạo thêm Admin trái phép.</span></header><div className="setup-checklist is-valid"><strong>✓ Hệ thống sẵn sàng</strong><span>File XLSX có mật khẩu tạm vừa được tải một lần. Nếu thất lạc, Admin phải đặt lại mật khẩu mới cho từng tài khoản.</span></div><div className="setup-handoff-downloads"><a className="primary-action" href="/api/setup/handoff/docx">Tải DOCX · Hồ sơ bàn giao</a><a className="secondary-button" href="/api/setup/handoff/xlsx">Tải XLSX · Danh sách IT (không mật khẩu)</a></div><p>DOCX và XLSX này lấy từ dữ liệu đã lưu trong hệ thống. Không tệp nào chứa password hash.</p><a className="primary-action" href="/">Đến trang chủ & đăng nhập →</a></section></main>;
}
