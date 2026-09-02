import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Building2,
  ChefHat,
  ClipboardCheck,
  FileCheck2,
  FolderOpen,
  GitFork,
  HeartPulse,
  MessageCircle,
  MonitorCog,
  Settings2,
  ShieldCheck,
  Soup,
  Truck,
} from "lucide-react";
import { DemoAdoptionSlider } from "@/components/demo-adoption-slider";
import { DemoEntry, type DemoEntryAccount } from "@/components/demo-entry";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { demoRoleGalleryItems } from "@/lib/demo-role-gallery";
import { getTranslations } from "@/lib/locale";
import { readLocale } from "@/lib/locale-server";
import { buildSocialMetadata } from "@/lib/social-metadata";

const GITHUB_URL = "https://github.com/Lo75d1/bao-an-benh-vien-mien-phi";
const DEPLOY_URL = `${GITHUB_URL}/blob/main/docs/DEPLOY.md`;
const DOCS_URL = `${GITHUB_URL}/tree/main/docs`;
const ARCHITECTURE_URL = `${GITHUB_URL}/blob/main/docs/bao-an-redesign/02-target-architecture.md`;
const DINH_DUONG_2598_URL = "https://dinhduong2598.food";
const ZALO_URL = "https://zalo.me/0986703396";

const roles = [
  { key: "nurse", icon: ClipboardCheck, title: "Điều dưỡng", description: "Báo suất theo khoa, cập nhật phát sinh và xác nhận giao nhận.", action: "Trải nghiệm vai trò này", account: { label: "Điều dưỡng", email: "nurse@demo.local", password: "Demo-Nurse-2026!" } },
  { key: "dietitian", icon: HeartPulse, title: "Dinh dưỡng", description: "Lập thực đơn, kiểm tra chỉ tiêu dinh dưỡng và phối hợp với bếp.", action: "Trải nghiệm vai trò này", account: { label: "Dinh dưỡng", email: "dietitian@demo.local", password: "Demo-Dietitian-2026!" } },
  { key: "kitchen", icon: ChefHat, title: "Bếp", description: "Nhận tổng suất, chuẩn bị bữa ăn, lưu bằng chứng và bàn giao cho khoa.", action: "Trải nghiệm vai trò này", account: { label: "Bếp", email: "kitchen@demo.local", password: "Demo-Kitchen-2026!" } },
  { key: "sonde", icon: Soup, title: "Bếp Sonde", description: "Theo dõi tuyến ăn qua sonde với lịch cữ và số suất độc lập.", action: "Trải nghiệm vai trò này", account: { label: "Bếp Sonde", email: "sonde@demo.local", password: "Demo-Sonde-2026!" } },
  { key: "admin", icon: Settings2, title: "Quản trị hệ thống", description: "Cấu hình khoa phòng, tài khoản, bữa ăn và theo dõi vận hành.", action: "Trải nghiệm vai trò này", account: { label: "Quản trị", email: "admin@demo.local", password: "Demo-Admin-2026!" } },
] as const;

const demoEntries: DemoEntryAccount[] = [
  { key: "patient", label: "Bệnh nhân / Người nhà", description: "Xem thực đơn công khai", href: "/?patient=1" },
  ...roles.map((role) => ({ key: role.key, label: role.title, description: role.description, email: role.account.email, password: role.account.password })),
];

const workflow = [
  { icon: ClipboardCheck, title: "Khoa báo suất", note: "Tổng hợp theo khoa" },
  { icon: HeartPulse, title: "Dinh dưỡng lập thực đơn", note: "Theo mã chế độ ăn" },
  { icon: ChefHat, title: "Bếp chuẩn bị", note: "Tách NORMAL / SONDE" },
  { icon: Truck, title: "Giao nhận", note: "Khoa xác nhận" },
  { icon: MonitorCog, title: "Quản trị theo dõi", note: "Báo cáo và cấu hình" },
] as const;

const adoptionScreens = [
  { src: "/demo/adoption/nurse-serving.jpg", title: "Khoa báo suất", description: "Điều dưỡng cập nhật số suất và phát sinh theo đúng bữa đang xử lý." },
  { src: "/demo/adoption/menu-planning.jpg", title: "Lập thực đơn", description: "Dinh dưỡng nhập món, thực phẩm hoặc dữ liệu Excel trước khi phân tích." },
  { src: "/demo/adoption/kitchen-serving.jpg", title: "Bếp chuẩn bị", description: "Bếp xem tổng suất, thực phẩm cần dùng, ảnh món và trạng thái giao nhận." },
  { src: "/demo/adoption/calendar.jpg", title: "Lịch tuần", description: "Các bữa trong tuần được theo dõi theo thời gian vận hành của bệnh viện." },
  { src: "/demo/adoption/reporting.jpg", title: "Báo cáo", description: "IT và quản trị có dữ liệu xuất Excel, PDF hoặc in theo phạm vi cần rà soát." },
  { src: "/demo/adoption/admin-settings.jpg", title: "Cấu hình bệnh viện", description: "Tài khoản, khoa phòng, mã chế độ và nhận diện được cấu hình theo từng đơn vị." },
] as const;

export async function generateMetadata() {
  return buildSocialMetadata("/demo");
}

export default async function DemoLandingPage() {
  const locale = await readLocale();
  const t = getTranslations(locale).public.roleGallery;
  const gallery = demoRoleGalleryItems(t, demoEntries);

  return (
    <main className="demo-reference-home">
      <header className="demo-reference-header">
        <Link href="/demo" className="demo-reference-brand"><span>SA</span><strong>Suất ăn bệnh viện</strong></Link>
        <nav aria-label="Điều hướng trang Demo">
          <a href="#gioi-thieu">Giới thiệu</a>
          <a href="#quy-trinh">Quy trình</a>
          <a href="#vai-tro">Vai trò</a>
          <a href="#it">Dành cho IT</a>
          <a href="#tai-lieu">Tài liệu</a>
          <DemoEntry accounts={demoEntries} triggerLabel="Trải nghiệm DEMO" triggerClassName="demo-header-action" />
        </nav>
      </header>

      <section id="gioi-thieu" className="demo-reference-hero" aria-labelledby="demo-title">
        <div className="demo-reference-hero-copy">
          <p className="demo-reference-badge"><ShieldCheck aria-hidden="true" />Bản DEMO - dữ liệu mô phỏng</p>
          <h1 id="demo-title">Mô hình tham chiếu số hóa suất ăn bệnh viện</h1>
          <p>Giúp Khoa Dinh dưỡng và bộ phận công nghệ thông tin cùng hình dung một quy trình quản lý suất ăn cụ thể, từ báo suất, thực đơn, bếp, giao nhận đến theo dõi và báo cáo.</p>
          <p>Có thể dùng làm mẫu tham khảo khi trao đổi, rà soát nghiệp vụ và triển khai hệ thống phù hợp với từng bệnh viện.</p>
          <div className="demo-reference-actions">
            <DemoEntry accounts={demoEntries} triggerLabel="Trải nghiệm DEMO" />
            <a href="#it">Hướng dẫn triển khai<ArrowRight aria-hidden="true" /></a>
          </div>
        </div>
        <figure className="demo-reference-visual">
          <Image src="/demo-quan-he-phoi-hop-suat-an.png" width={1536} height={1024} sizes="(max-width: 860px) 92vw, 560px" alt="Sơ đồ phối hợp giữa người bệnh, khoa điều trị, dinh dưỡng, bếp và quản trị trong hệ thống suất ăn bệnh viện" priority />
          <figcaption>Một sơ đồ chung để dinh dưỡng và IT cùng rà quy trình trước khi tùy chỉnh triển khai.</figcaption>
        </figure>
      </section>

      <section id="quy-trinh" className="demo-workflow-strip" aria-labelledby="workflow-title">
        <h2 id="workflow-title">Quy trình hoạt động</h2>
        <div>
          {workflow.map((step, index) => {
            const Icon = step.icon;
            return <article key={step.title}><span>{String(index + 1).padStart(2, "0")}</span><Icon aria-hidden="true" /><h3>{step.title}</h3><p>{step.note}</p></article>;
          })}
        </div>
      </section>

      <section className="demo-reference-section demo-why-demo" aria-labelledby="why-title">
        <div className="demo-section-heading"><p>Vì sao có DEMO này?</p><h2 id="why-title">Một điểm bắt đầu cụ thể cho trao đổi nghiệp vụ</h2></div>
        <div className="demo-two-column">
          <article><h3>Khó khăn thường gặp</h3><ul><li>Khó mô tả đầy đủ quy trình nghiệp vụ chỉ bằng lời.</li><li>Nhiều bộ phận cùng tham gia nhưng khó hình dung luồng dữ liệu.</li><li>IT phải mất thời gian làm rõ yêu cầu trước khi bắt đầu.</li></ul></article>
          <article><h3>DEMO giúp gì?</h3><ul><li>Có một mô hình cụ thể để cùng xem và trao đổi.</li><li>Khoa Dinh dưỡng dễ chỉ ra phần cần giữ, sửa hoặc bổ sung.</li><li>IT có điểm bắt đầu rõ ràng thay vì xây từ con số 0.</li><li>Có thể tùy chỉnh theo thực tế từng bệnh viện.</li></ul></article>
        </div>
      </section>

      <section id="vai-tro" className="demo-role-gallery" aria-labelledby="demo-role-gallery-title">
        <header>
          <p>Trải nghiệm theo vai trò</p>
          <h2 id="demo-role-gallery-title">{t.title}</h2>
          <span>{t.description}</span>
        </header>
        <div className="demo-role-gallery-track">
          {gallery.map((item) => (
            <article key={item.role} className="demo-role-gallery-card">
              <Dialog>
                <DialogTrigger asChild>
                  <button type="button" className="demo-role-gallery-image" aria-label={t.openPreview.replace("{role}", item.title)}>
                    <Image src={item.image} alt={item.alt} width={960} height={960} sizes="(max-width: 720px) 82vw, 32vw" />
                  </button>
                </DialogTrigger>
                <DialogContent className="demo-role-preview-dialog">
                  <DialogHeader><DialogTitle>{item.title}</DialogTitle><DialogDescription>{item.description}</DialogDescription></DialogHeader>
                  <Image src={item.image} alt={item.alt} width={1200} height={1200} sizes="92vw" />
                </DialogContent>
              </Dialog>
              <div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                {item.role === "kitchen" ? <span className="demo-role-route">NORMAL / SONDE</span> : null}
                {item.entry ? <DemoEntry accounts={demoEntries} compactAccount={{ ...item.entry, label: "Trải nghiệm vai trò này" }} /> : null}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="demo-reference-section demo-adoption" aria-labelledby="adoption-title">
        <div className="demo-section-heading"><p>Bệnh viện dùng mẫu này thế nào?</p><h2 id="adoption-title">Từ trải nghiệm mẫu đến triển khai do bệnh viện sở hữu</h2></div>
        <div className="demo-adoption-layout">
          <div className="demo-adoption-steps" aria-label="Quy trình bệnh viện dùng mẫu DEMO">
            <article><strong>1</strong><h3>Khoa Dinh dưỡng trải nghiệm</h3><p>Xem mô hình, dữ liệu mô phỏng và các luồng nghiệp vụ.</p></article>
            <article><strong>2</strong><h3>Cùng IT rà quy trình</h3><p>Đối chiếu với cách bệnh viện đang vận hành và thống nhất yêu cầu cần điều chỉnh.</p></article>
            <article><strong>3</strong><h3>Tùy chỉnh và triển khai</h3><p>IT cấu hình hệ thống, domain, khoa/phòng, bữa ăn, tài khoản và quy trình theo đơn vị.</p></article>
          </div>
          <DemoAdoptionSlider screens={adoptionScreens} />
        </div>
      </section>

      <section id="it" className="demo-it-section" aria-labelledby="it-title">
        <div className="demo-section-heading"><p>Dành cho IT bệnh viện</p><h2 id="it-title">Tài nguyên để kiểm tra, tải về và triển khai</h2></div>
        <div className="demo-it-grid">
          <article><GitFork aria-hidden="true" /><h3>Mã nguồn GitHub</h3><p>Mã nguồn mở để kiểm tra, tải về và tùy chỉnh.</p><a href={GITHUB_URL} target="_blank" rel="noreferrer">Mở GitHub<ArrowRight aria-hidden="true" /></a></article>
          <article><BookOpen aria-hidden="true" /><h3>Hướng dẫn cài đặt</h3><p>Các bước triển khai, cấu hình môi trường và vận hành.</p><a href={DEPLOY_URL} target="_blank" rel="noreferrer">Xem DEPLOY.md<ArrowRight aria-hidden="true" /></a></article>
          <article><Building2 aria-hidden="true" /><h3>Kiến trúc hệ thống</h3><p>Tổng quan cấu trúc, dịch vụ và cách các thành phần phối hợp.</p><a href={ARCHITECTURE_URL} target="_blank" rel="noreferrer">Xem kiến trúc<ArrowRight aria-hidden="true" /></a></article>
          <article><FolderOpen aria-hidden="true" /><h3>Tùy chỉnh theo bệnh viện</h3><p>Hướng dẫn các điểm cần thay đổi khi triển khai cho từng đơn vị.</p><a href={DOCS_URL} target="_blank" rel="noreferrer">Mở thư mục tài liệu<ArrowRight aria-hidden="true" /></a></article>
        </div>
      </section>

      <section id="tai-lieu" className="demo-reference-card" aria-labelledby="reference-title">
        <FileCheck2 aria-hidden="true" />
        <div><h2 id="reference-title">Căn cứ tham khảo</h2><p>Mô hình được xây dựng có tham khảo các quy định và hướng dẫn liên quan đến hoạt động dinh dưỡng, quản lý suất ăn và tổ chức chăm sóc dinh dưỡng trong bệnh viện.</p></div>
        <a href={DOCS_URL} target="_blank" rel="noreferrer">Xem căn cứ tham khảo</a>
      </section>

      <section className="demo-transparency" aria-labelledby="transparency-title">
        <h2 id="transparency-title">Minh bạch về bản DEMO</h2>
        <ul><li>Dữ liệu trong DEMO là dữ liệu mô phỏng.</li><li>DEMO phục vụ tham khảo quy trình và trải nghiệm hệ thống.</li><li>Không dùng DEMO để thay thế quyết định chuyên môn hoặc quy trình chính thức của bệnh viện.</li><li>Mỗi đơn vị cần tự rà soát, cấu hình, kiểm thử và ban hành quy trình phù hợp trước khi triển khai thực tế.</li></ul>
      </section>

      <section id="ho-tro" className="demo-support"><div><MessageCircle aria-hidden="true" /><span><strong>Cần hỗ trợ triển khai hoặc góp ý dự án?</strong><p>Liên hệ trực tiếp người phát triển để trao đổi đúng phiên bản và đúng nhu cầu của bệnh viện.</p></span></div><a href={ZALO_URL} target="_blank" rel="noreferrer"><span>Lê Công Bảo Long</span><strong>Zalo 0986703396</strong><ArrowRight aria-hidden="true" /></a></section>

      <footer className="demo-product-footer"><div><strong>Suất ăn bệnh viện</strong><span>Dự án cộng đồng, có thể tự triển khai và tùy chỉnh cho từng bệnh viện.</span></div><div><a href={GITHUB_URL} target="_blank" rel="noreferrer">GitHub</a><a href={DOCS_URL} target="_blank" rel="noreferrer">Tài liệu</a><a href={DINH_DUONG_2598_URL} target="_blank" rel="noreferrer">Dinh dưỡng 2598</a><a href={ZALO_URL} target="_blank" rel="noreferrer">Hỗ trợ qua Zalo</a></div></footer>
    </main>
  );
}
