import Image from "next/image";

const roleCards = [
  {
    asset: "hospital-workflow.svg",
    title: "Bệnh nhân",
    subtitle: "Xem thông tin bữa ăn",
    description: "Xem bữa hôm nay, thực đơn từng bữa, giờ phục vụ và ghi chú dinh dưỡng công khai.",
    points: ["Bữa hiện tại", "Bữa kế tiếp", "Gửi ghi chú"],
  },
  {
    asset: "department-reporting.svg",
    title: "Điều dưỡng",
    subtitle: "Báo suất và xác nhận giao nhận",
    description: "Báo số lượng theo khoa, cập nhật phát sinh và xác nhận nhận đủ hoặc thiếu từ bếp.",
    points: ["Báo suất", "Bổ sung", "Nhận đủ/thiếu"],
  },
  {
    asset: "nutrition-menu-flow.svg",
    title: "Dinh dưỡng",
    subtitle: "Lập thực đơn và theo dõi dinh dưỡng",
    description: "Tạo thực đơn theo mã chế độ ăn, phân tích khẩu phần và theo dõi tình hình toàn viện.",
    points: ["Thực đơn", "Khẩu phần", "NORMAL/Sonde"],
  },
  {
    asset: "food-safety-flow.svg",
    title: "Bếp",
    subtitle: "Chuẩn bị và bàn giao suất ăn",
    description: "Nhận tổng suất cần chuẩn bị, xem món đã duyệt, lưu ảnh bằng chứng và bàn giao cho khoa.",
    points: ["Tổng suất", "Ảnh món", "Bàn giao"],
  },
  {
    asset: "operations-overview.svg",
    title: "Admin",
    subtitle: "Quản trị và điều hành hệ thống",
    description: "Cấu hình khoa, bữa, tài khoản, giờ vận hành, dữ liệu nền, báo cáo và audit.",
    points: ["Phân quyền", "Cấu hình", "Báo cáo"],
  },
] as const;

const flowSteps = ["Khoa báo suất", "Dinh dưỡng chốt thực đơn", "Bếp chuẩn bị", "Lưu ảnh bằng chứng", "Bếp bàn giao", "Khoa xác nhận"];

export function DemoSystemIntro() {
  return <section id="gioi-thieu-he-thong" className="demo-system-story demo-system-compact" aria-labelledby="system-story-title">
    <header><p>Giới thiệu nhanh</p><h2 id="system-story-title">Năm vai trò, một luồng suất ăn thống nhất</h2><span>Thay vì xem từng sơ đồ riêng lẻ, phần này gom toàn bộ hệ thống vào các vai chính để bệnh viện nắm nhanh ai làm gì và dữ liệu đi qua đâu.</span></header>
    <div className="demo-system-role-grid">
      {roleCards.map((role) => <article key={role.title} className="demo-system-role-card">
        <figure><Image src={`/intro/${role.asset}`} width={720} height={420} sizes="(max-width: 820px) 100vw, 24vw" alt={`${role.title}: ${role.subtitle}`}/></figure>
        <div><span>{role.title}</span><h3>{role.subtitle}</h3><p>{role.description}</p><ul>{role.points.map((point) => <li key={point}>{point}</li>)}</ul></div>
      </article>)}
    </div>
    <div className="demo-system-flow" aria-label="Luồng vận hành suất ăn bệnh viện">
      {flowSteps.map((step, index) => <div key={step}><span>{String(index + 1).padStart(2, "0")}</span><strong>{step}</strong></div>)}
    </div>
  </section>;
}
