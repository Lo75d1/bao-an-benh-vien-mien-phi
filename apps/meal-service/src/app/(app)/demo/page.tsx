import Link from "next/link";
import { ArrowRight, ChefHat, ClipboardList, HeartPulse, ShieldCheck, Sparkles, Utensils } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LoginForm } from "@/components/login-form";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";

const accounts = [
  { label: "Quản trị / Trưởng khoa", email: "admin@demo.local", password: "Demo-Admin-2026!" },
  { label: "Dinh dưỡng", email: "dietitian@demo.local", password: "Demo-Dietitian-2026!" },
  { label: "Điều dưỡng", email: "nurse@demo.local", password: "Demo-Nurse-2026!" },
  { label: "Bếp ăn thường", email: "kitchen@demo.local", password: "Demo-Kitchen-2026!" },
  { label: "Bếp Sonde", email: "sonde@demo.local", password: "Demo-Sonde-2026!" },
];

export default async function DemoLandingPage() {
  const user = await getSessionUser();
  if (user) redirect({ ADMIN: "/quan-ly", DIETITIAN: "/quan-ly", NURSE: "/bao-suat", KITCHEN: "/bep" }[user.role]);
  return <main className="demo-landing"><header><Link href="/demo" className="demo-logo"><span>SA</span><strong>Suất ăn bệnh viện</strong></Link><div><Link href="/?patient=1">Xem thực đơn bệnh nhân</Link><Dialog><DialogTrigger asChild><button className="primary-action">Trải nghiệm Demo</button></DialogTrigger><DialogContent className="max-h-[92vh] max-w-md overflow-y-auto"><DialogHeader><DialogTitle>Chọn vai trò để trải nghiệm</DialogTitle><DialogDescription>Dữ liệu minh họa được tạo sẵn. Sau khi vào hệ thống, hướng dẫn nhỏ sẽ chỉ đúng việc cần làm.</DialogDescription></DialogHeader><LoginForm demoAccounts={accounts}/></DialogContent></Dialog></div></header>
    <section className="demo-hero"><div><p className="eyebrow"><Sparkles/>Bản Demo công khai</p><h1>Mỗi suất ăn đi đúng người, đúng giờ, đúng chế độ.</h1><p>Theo dõi liền mạch từ khoa báo suất, dinh dưỡng lên thực đơn đến bếp chuẩn bị và khoa xác nhận giao nhận.</p><Dialog><DialogTrigger asChild><button className="primary-action">Bắt đầu trải nghiệm <ArrowRight/></button></DialogTrigger><DialogContent className="max-h-[92vh] max-w-md overflow-y-auto"><DialogHeader><DialogTitle>Chọn vai trò</DialogTitle><DialogDescription>Bạn có thể quay lại và thử vai trò khác bất cứ lúc nào.</DialogDescription></DialogHeader><LoginForm demoAccounts={accounts}/></DialogContent></Dialog></div><div className="demo-product-preview" aria-label="Luồng vận hành minh họa"><span>Vận hành hôm nay</span><strong>Bữa trưa · đang chuẩn bị</strong><div className="demo-progress"><i className="done">1</i><span/><i className="active">2</i><span/><i>3</i></div><ul><li><ClipboardList/><span><strong>Khoa báo suất</strong><small>Đã chốt theo đường nuôi</small></span></li><li><Utensils/><span><strong>Dinh dưỡng</strong><small>Thực đơn và định lượng</small></span></li><li><ChefHat/><span><strong>Nhà bếp</strong><small>Chuẩn bị và bằng chứng</small></span></li></ul></div></section>
    <section className="demo-flow"><article><ClipboardList/><strong>Điều dưỡng</strong><p>Báo suất và bổ sung đúng bữa, đúng đường nuôi.</p></article><article><HeartPulse/><strong>Dinh dưỡng</strong><p>Lên thực đơn nhiều mã, phân tích và tái dùng mẫu.</p></article><article><ChefHat/><strong>Bếp</strong><p>Nắm số suất, nguyên liệu và việc cần làm tiếp theo.</p></article><article><ShieldCheck/><strong>Quản trị</strong><p>Điều phối theo thời gian thật với lịch sử truy vết.</p></article></section>
  </main>;
}
