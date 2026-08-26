import Link from "next/link";
import { ArrowRight, ChefHat, ClipboardCheck, FileSpreadsheet, HeartPulse, Home, MessageCircle, Settings2, ShieldCheck, Soup, Utensils } from "lucide-react";
import { DemoEntry, type DemoEntryAccount } from "@/components/demo-entry";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";

const roles = [
  { key: "nurse", icon: ClipboardCheck, title: "Điều dưỡng của khoa", description: "Báo suất đúng chế độ, gửi bổ sung sau chốt và xác nhận khoa đã nhận đủ hay còn thiếu.", action: "Vào màn báo suất", badge: undefined, account: { label: "Điều dưỡng", email: "nurse@demo.local", password: "Demo-Nurse-2026!" } },
  { key: "dietitian", icon: HeartPulse, title: "Dinh dưỡng viên", description: "Lên thực đơn nhiều mã, tìm món và thực phẩm, phân tích khẩu phần hoặc nhập nhanh từ tệp Excel.", action: "Thử lên thực đơn", badge: "Có nhập Excel", account: { label: "Dinh dưỡng", email: "dietitian@demo.local", password: "Demo-Dietitian-2026!" } },
  { key: "kitchen", icon: ChefHat, title: "Bếp ăn thường", description: "Nắm số suất từng khoa, nguyên liệu cần dùng, phát sinh và bằng chứng chuẩn bị bữa ăn.", action: "Vào bếp ăn thường", badge: undefined, account: { label: "Bếp ăn thường", email: "kitchen@demo.local", password: "Demo-Kitchen-2026!" } },
  { key: "sonde", icon: Soup, title: "Bếp Sonde", description: "Theo dõi lịch cữ riêng, thực đơn Sonde và số suất độc lập với bếp ăn đường miệng.", action: "Vào bếp Sonde", badge: undefined, account: { label: "Bếp Sonde", email: "sonde@demo.local", password: "Demo-Sonde-2026!" } },
  { key: "admin", icon: Settings2, title: "Quản trị và điều hành", description: "Theo dõi vận hành hôm nay, lịch tuần, báo cáo, nhân sự và cấu hình giờ nghiệp vụ.", action: "Vào trang điều hành", badge: undefined, account: { label: "Quản trị", email: "admin@demo.local", password: "Demo-Admin-2026!" } },
] as const;

const demoEntries: DemoEntryAccount[] = [
  { key: "patient", label: "Trang bệnh nhân", description: "Xem thực đơn công khai", href: "/?patient=1" },
  ...roles.map((role) => ({ key: role.key, label: role.title, description: role.badge ?? role.action, email: role.account.email, password: role.account.password })),
];

function RoleDialog({ role }: { role: (typeof roles)[number] }) {
  const Icon = role.icon;
  const entry = demoEntries.find((item) => item.key === role.key)!;
  return <article className={`demo-journey-item ${role.key}`}><div className="demo-journey-icon"><Icon aria-hidden="true"/></div><div className="demo-journey-copy"><span>{role.badge ?? `Vai trò ${role.title}`}</span><h3>{role.title}</h3><p>{role.description}</p><DemoEntry accounts={demoEntries} compactAccount={{ ...entry, label: role.action }}/></div></article>;
}

export default async function DemoLandingPage() {
  const user = await getSessionUser();
  if (user) redirect({ ADMIN: "/quan-ly", DIETITIAN: "/quan-ly", NURSE: "/bao-suat", KITCHEN: "/bep" }[user.role]);
  return <main className="demo-product-home">
    <header className="demo-product-header"><Link href="/demo" className="demo-product-brand"><span>SA</span><strong>Suất ăn bệnh viện miễn phí</strong></Link><nav aria-label="Điều hướng trang Demo"><a href="#huong-dan">Hướng dẫn Demo</a><a href="#ho-tro">Hỗ trợ</a><Link href="/?patient=1" className="demo-header-action">Xem thực đơn bệnh nhân</Link></nav></header>

    <section className="demo-product-intro" aria-labelledby="demo-title"><div><p className="demo-kicker"><ShieldCheck aria-hidden="true"/>Dự án mã nguồn mở cho bệnh viện</p><h1 id="demo-title">Một quy trình rõ ràng cho mỗi suất ăn.</h1><p>Kết nối khoa điều trị, dinh dưỡng và nhà bếp trong cùng một luồng vận hành theo thời gian thực.</p><DemoEntry accounts={demoEntries}/></div><aside aria-label="Quy trình sản phẩm"><span>Luồng vận hành</span><ol><li><ClipboardCheck/><strong>Khoa báo suất</strong></li><li><HeartPulse/><strong>Dinh dưỡng lên thực đơn</strong></li><li><ChefHat/><strong>Bếp chuẩn bị</strong></li><li><Utensils/><strong>Khoa xác nhận giao nhận</strong></li></ol></aside></section>

    <section id="huong-dan" className="demo-guide-section" aria-labelledby="guide-title"><header><p>Hướng dẫn trải nghiệm</p><h2 id="guide-title">Đi qua hệ thống theo đúng người thực hiện</h2><span>Bắt đầu ở trang bệnh nhân, sau đó thử năm vị trí làm việc. Mỗi tài khoản có dữ liệu và hướng dẫn riêng.</span></header>
      <div className="demo-home-step"><div><Home aria-hidden="true"/><span>Điểm bắt đầu</span></div><div><h3>Trang chủ dành cho bệnh nhân</h3><p>Xem thực đơn theo mã chế độ ăn và ngày bệnh viện cho phép công khai. Không cần đăng nhập và không yêu cầu mã khoa.</p><Link href="/?patient=1">Mở trang bệnh nhân<ArrowRight aria-hidden="true"/></Link></div></div>
      <div className="demo-journey-list">{roles.map((role) => <RoleDialog key={role.key} role={role}/>)}</div>
      <div className="demo-excel-note"><FileSpreadsheet aria-hidden="true"/><div><strong>Dữ liệu thực đơn có thể nhập từ Excel</strong><p>Dinh dưỡng viên có thể phân tích tệp, kiểm tra các trường nhận diện rồi đưa món và thực phẩm vào đúng mã chế độ.</p></div></div>
    </section>

    <section id="ho-tro" className="demo-support"><div><MessageCircle aria-hidden="true"/><span><strong>Cần hỗ trợ triển khai hoặc góp ý dự án?</strong><p>Liên hệ trực tiếp người phát triển để tránh nhầm với đơn vị bệnh viện đang sử dụng bản clone.</p></span></div><a href="https://zalo.me/0986703396" target="_blank" rel="noreferrer"><span>Lê Công Bảo Long</span><strong>Zalo 0986703396</strong><ArrowRight aria-hidden="true"/></a></section>

    <footer className="demo-product-footer"><div><strong>Suất ăn bệnh viện miễn phí</strong><span>Dự án cộng đồng, có thể tự triển khai và tùy chỉnh cho từng bệnh viện.</span></div><div><a href="https://dinhduong2598.food" target="_blank" rel="noreferrer">Dinh dưỡng 2598</a><a href="https://zalo.me/0986703396" target="_blank" rel="noreferrer">Hỗ trợ qua Zalo</a></div></footer>
  </main>;
}
