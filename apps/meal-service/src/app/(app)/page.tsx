import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { LoginForm } from "@/components/login-form";
import { PatientAccessForm } from "@/components/patient-access-form";
import { getSessionUser } from "@/lib/auth";

const HOME_COPY = {
  ADMIN: { title: "Kiểm tra vận hành hôm nay", description: "Theo dõi các bữa cần chú ý và mở lịch để kiểm tra theo tuần.", action: "Xem lịch toàn viện" },
  DIETITIAN: { title: "Thực đơn nào cần lên tiếp?", description: "Mở lịch để nhận biết bữa và chế độ chưa có thực đơn. Nhập món sẽ được triển khai ở M2.", action: "Kiểm tra lịch thực đơn" },
  NURSE: { title: "Bạn cần báo suất hôm nay", description: "Nhập số suất theo từng chế độ cho khoa được gán. Bạn có thể sửa trước giờ chốt.", action: "Báo suất khoa mình" },
  KITCHEN: { title: "Bữa nào cần xử lý tiếp?", description: "Mở lịch để theo dõi trạng thái và số suất tổng theo từng chế độ.", action: "Xem lịch chế biến" },
} as const;

export default async function HomePage() {
  const user = await getSessionUser();
  if (!user) {
    return (
      <main className="login-page">
        <section className="login-intro">
          <p className="eyebrow">Hệ thống điều phối suất ăn</p>
          <h1>Mỗi bữa ăn được chuẩn bị đúng việc, đúng thời điểm.</h1>
          <p>Lịch tuần chung giúp dinh dưỡng, điều dưỡng, bếp và quản trị phối hợp trên cùng một nguồn dữ liệu.</p>
          <div className="public-patient-entry"><p className="eyebrow">Dành cho bệnh nhân và người nhà</p><h2>Xem bữa ăn của khoa</h2><PatientAccessForm /></div>
        </section>
        <section className="login-panel" aria-labelledby="login-title">
          <p className="eyebrow">Dành cho nhân viên</p>
          <h2 id="login-title">Đăng nhập</h2>
          <LoginForm />
        </section>
      </main>
    );
  }
  const copy = HOME_COPY[user.role];
  return (
    <AppShell user={user}>
      <main className="workspace role-home">
        <p className="eyebrow">Việc tiếp theo</p>
        <h1>{copy.title}</h1>
        <p className="lead">{copy.description}</p>
        <Link className="primary-link" href={user.role === "DIETITIAN" ? "/thuc-don" : user.role === "NURSE" ? "/bao-suat" : "/lich"}>{copy.action}</Link>
      </main>
    </AppShell>
  );
}
