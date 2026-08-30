import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BookOpen, ChefHat, ClipboardCheck, Download, FileSpreadsheet, FolderOpen, GitFork, GitFork as Github, HeartPulse, Home, LifeBuoy, MessageCircle, Settings2, ShieldCheck, Soup, Utensils } from "lucide-react";
import { DemoEntry, type DemoEntryAccount } from "@/components/demo-entry";
import { DemoSystemIntro } from "@/components/demo-system-intro";

const roles = [
  { key: "patient", icon: Home, title: "Trang chủ bệnh nhân", description: "Xem thực đơn công khai theo mã chế độ ăn, suất hiện tại/suất kế tiếp và gửi ghi chú cho khoa mà không cần đăng nhập.", action: "Mở trang bệnh nhân", badge: "Không cần đăng nhập", account: { label: "Bệnh nhân", href: "/?patient=1" } },
  { key: "nurse", icon: ClipboardCheck, title: "Điều dưỡng của khoa", description: "Báo suất đúng chế độ, gửi bổ sung sau chốt và xác nhận khoa đã nhận đủ hay còn thiếu.", action: "Vào màn báo suất", badge: undefined, account: { label: "Điều dưỡng", email: "nurse@demo.local", password: "Demo-Nurse-2026!" } },
  { key: "dietitian", icon: HeartPulse, title: "Dinh dưỡng viên", description: "Lên thực đơn nhiều mã, tìm món và thực phẩm, phân tích khẩu phần hoặc nhập nhanh từ tệp Excel.", action: "Thử lên thực đơn", badge: "Có nhập Excel", account: { label: "Dinh dưỡng", email: "dietitian@demo.local", password: "Demo-Dietitian-2026!" } },
  { key: "kitchen", icon: ChefHat, title: "Bếp ăn thường", description: "Nắm số suất từng khoa, nguyên liệu cần dùng, phát sinh và bằng chứng chuẩn bị bữa ăn.", action: "Vào bếp ăn thường", badge: undefined, account: { label: "Bếp ăn thường", email: "kitchen@demo.local", password: "Demo-Kitchen-2026!" } },
  { key: "sonde", icon: Soup, title: "Bếp Sonde", description: "Theo dõi lịch cữ riêng, thực đơn Sonde và số suất độc lập với bếp ăn đường miệng.", action: "Vào bếp Sonde", badge: undefined, account: { label: "Bếp Sonde", email: "sonde@demo.local", password: "Demo-Sonde-2026!" } },
  { key: "admin", icon: Settings2, title: "Quản trị và điều hành", description: "Theo dõi vận hành hôm nay, lịch tuần, báo cáo, nhân sự và cấu hình giờ nghiệp vụ.", action: "Vào trang điều hành", badge: undefined, account: { label: "Quản trị", email: "admin@demo.local", password: "Demo-Admin-2026!" } },
] as const;

const demoEntries: DemoEntryAccount[] = [
  ...roles.map((role) => ({ key: role.key, label: role.title, description: role.badge ?? role.action, ...("href" in role.account ? { href: role.account.href } : { email: role.account.email, password: role.account.password }) })),
];

function RoleDialog({ role }: { role: (typeof roles)[number] }) {
  const Icon = role.icon;
  const entry = demoEntries.find((item) => item.key === role.key)!;
  return <article id={role.key === "dietitian" ? "dinh-duong" : undefined} className={`demo-journey-item ${role.key}`}><div className="demo-journey-icon"><Icon aria-hidden="true"/></div><div className="demo-journey-copy"><span>{role.badge ?? `Vai trò ${role.title}`}</span><h3>{role.title}</h3><p>{role.description}</p><DemoEntry accounts={demoEntries} compactAccount={{ ...entry, label: role.action }}/></div></article>;
}

export default function DemoLandingPage() {
  return <main className="demo-product-home">
    <header className="demo-product-header"><Link href="/demo" className="demo-product-brand"><span>SA</span><strong>Suất ăn bệnh viện miễn phí</strong></Link><nav aria-label="Điều hướng trang Demo"><a className="demo-guide-action" href="#dinh-duong" aria-label="Xem hướng dẫn dành cho dinh dưỡng viên"><BookOpen aria-hidden="true"/><span>Hướng dẫn dùng</span></a><a href="#ho-tro">Hỗ trợ</a><a className="demo-github-action" href="https://github.com/Lo75d1/bao-an-benh-vien-mien-phi/blob/main/docs/DEPLOY.md" target="_blank" rel="noreferrer" aria-label="Hướng dẫn cài đặt hệ thống dành cho IT bệnh viện"><GitFork aria-hidden="true"/><span>IT cài đặt</span></a><DemoEntry accounts={demoEntries} triggerLabel="Vào Demo" triggerClassName="demo-header-action"/></nav></header>

    <section className="demo-product-intro" data-landing-guide="intro" aria-labelledby="demo-title"><div><p className="demo-kicker"><ShieldCheck aria-hidden="true"/>Dự án mã nguồn mở cho bệnh viện</p><h1 id="demo-title">Một quy trình rõ ràng cho mỗi suất ăn.</h1><p>Kết nối khoa điều trị, dinh dưỡng và nhà bếp trong cùng một luồng vận hành theo thời gian thực.</p><span data-landing-guide="start"><DemoEntry accounts={demoEntries}/></span></div><aside data-landing-guide="timeline" aria-label="Quy trình sản phẩm"><span>Luồng vận hành</span><ol><li><ClipboardCheck/><strong>Khoa báo suất</strong></li><li><HeartPulse/><strong>Dinh dưỡng lên thực đơn</strong></li><li><ChefHat/><strong>Bếp chuẩn bị</strong></li><li><Utensils/><strong>Khoa xác nhận giao nhận</strong></li></ol></aside></section>

    <section className="demo-relationship-section" aria-labelledby="relationship-title">
      <header><p>Các bên phối hợp thế nào?</p><h2 id="relationship-title">Một nguồn dữ liệu, năm vị trí cùng làm việc</h2><span>Sơ đồ cho thấy thông tin được chuyển giữa người bệnh, khoa điều trị, dinh dưỡng, bếp và quản trị trong toàn bộ vòng đời một bữa ăn.</span></header>
      <figure className="demo-relationship-figure">
        <div className="demo-relationship-canvas"><Image src="/demo-quan-he-phoi-hop-suat-an.png" width={1536} height={1024} sizes="(max-width: 820px) 900px, 1180px" alt="Sơ đồ quan hệ phối hợp giữa người bệnh, khoa điều dưỡng, dinh dưỡng, bếp và quản trị trong hệ thống suất ăn bệnh viện" priority={false}/></div>
        <figcaption><span>Luồng hai chiều giúp mỗi bên biết dữ liệu mình nhận, việc mình cần làm và kết quả phải bàn giao.</span><small>Trên điện thoại, vuốt ngang để xem rõ toàn bộ sơ đồ.</small></figcaption>
      </figure>
    </section>

    <DemoSystemIntro />

    <section id="huong-dan" className="demo-guide-section" aria-labelledby="guide-title"><header><p>Hướng dẫn trải nghiệm</p><h2 id="guide-title">Đi qua hệ thống theo đúng người thực hiện</h2><span>Bắt đầu ở trang bệnh nhân, sau đó thử năm vị trí làm việc. Mỗi tài khoản có dữ liệu và hướng dẫn riêng.</span></header>
      <div className="demo-home-step"><div><Home aria-hidden="true"/><span>Điểm bắt đầu</span></div><div><h3>Trang chủ dành cho bệnh nhân</h3><p>Xem thực đơn theo mã chế độ ăn và ngày bệnh viện cho phép công khai. Không cần đăng nhập và không yêu cầu mã khoa.</p><Link href="/?patient=1">Mở trang bệnh nhân<ArrowRight aria-hidden="true"/></Link></div></div>
      <div className="demo-journey-list" data-landing-guide="workspaces">{roles.map((role) => <RoleDialog key={role.key} role={role}/>)}</div>
      <div className="demo-excel-note"><FileSpreadsheet aria-hidden="true"/><div><strong>Dữ liệu thực đơn có thể nhập từ Excel</strong><p>Dinh dưỡng viên có thể phân tích tệp, kiểm tra các trường nhận diện rồi đưa món và thực phẩm vào đúng mã chế độ.</p></div></div>
    </section>

    <section className="demo-resource-section" aria-labelledby="resource-title"><header><p>Tự triển khai và sử dụng</p><h2 id="resource-title">Mọi thứ bệnh viện cần để bắt đầu</h2><span>Tải mã nguồn, đọc tài liệu theo đúng vai trò và liên hệ hỗ trợ khi cần. Không cần tìm trong các menu nghiệp vụ.</span></header><div className="demo-resource-grid"><article><Download aria-hidden="true"/><span>Tải về</span><h3>Mã nguồn mở đầy đủ</h3><p>Tải bản chính thức hoặc mở kho GitHub để IT bệnh viện kiểm tra và triển khai.</p><div><a href="https://github.com/Lo75d1/bao-an-benh-vien-mien-phi/archive/refs/heads/main.zip">Tải tệp ZIP</a><a href="https://github.com/Lo75d1/bao-an-benh-vien-mien-phi" target="_blank" rel="noreferrer"><Github/>Mở GitHub</a></div></article><article><FolderOpen aria-hidden="true"/><span>Tài liệu &amp; hướng dẫn</span><h3>Đi từ cài đặt đến vận hành</h3><p>Tài liệu dành cho IT và đặc tả quy trình để từng bộ phận hiểu đúng phần việc.</p><div><a href="https://github.com/Lo75d1/bao-an-benh-vien-mien-phi/blob/main/docs/DEPLOY.md" target="_blank" rel="noreferrer">Hướng dẫn cài đặt</a><a href="https://github.com/Lo75d1/bao-an-benh-vien-mien-phi/tree/main/docs" target="_blank" rel="noreferrer"><BookOpen/>Thư mục tài liệu</a></div></article><article><LifeBuoy aria-hidden="true"/><span>Nhóm hỗ trợ &amp; liên hệ</span><h3>Trao đổi với người phát triển</h3><p>Báo lỗi trên GitHub hoặc liên hệ trực tiếp để được hướng dẫn đúng phiên bản.</p><div><a href="https://github.com/Lo75d1/bao-an-benh-vien-mien-phi/issues" target="_blank" rel="noreferrer">Báo lỗi / góp ý</a><a href="https://zalo.me/0986703396" target="_blank" rel="noreferrer"><MessageCircle/>Zalo hỗ trợ</a></div></article></div></section>

    <section id="ho-tro" className="demo-support"><div><MessageCircle aria-hidden="true"/><span><strong>Cần hỗ trợ triển khai hoặc góp ý dự án?</strong><p>Liên hệ trực tiếp người phát triển để tránh nhầm với đơn vị bệnh viện đang sử dụng bản clone.</p></span></div><a href="https://zalo.me/0986703396" target="_blank" rel="noreferrer"><span>Lê Công Bảo Long</span><strong>Zalo 0986703396</strong><ArrowRight aria-hidden="true"/></a></section>

    <footer className="demo-product-footer"><div><strong>Suất ăn bệnh viện miễn phí</strong><span>Dự án cộng đồng, có thể tự triển khai và tùy chỉnh cho từng bệnh viện.</span></div><div><a href="https://github.com/Lo75d1/bao-an-benh-vien-mien-phi" target="_blank" rel="noreferrer">Mã nguồn GitHub</a><a href="https://dinhduong2598.food" target="_blank" rel="noreferrer">Dinh dưỡng 2598</a><a href="https://zalo.me/0986703396" target="_blank" rel="noreferrer">Hỗ trợ qua Zalo</a></div></footer>
  </main>;
}
