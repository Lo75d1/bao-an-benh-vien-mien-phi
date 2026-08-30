import Image from "next/image";

const stories = [
  { asset: "hospital-workflow.svg", eyebrow: "Toàn cảnh", title: "Một luồng dữ liệu thống nhất", description: "Từ khoa báo suất, dinh dưỡng lên thực đơn, bếp chuẩn bị đến giao nhận đều đi trên cùng một dòng dữ liệu.", audience: "Bệnh viện", points: ["Đúng người", "Đúng thời điểm", "Có xác nhận"] },
  { asset: "before-after-digital.svg", eyebrow: "Trước và sau", title: "Thu gọn thông tin phân tán", description: "Giấy, điện thoại, Excel và trao đổi miệng được quy về một quy trình có mốc giờ và trách nhiệm rõ ràng.", audience: "Ban giám đốc", points: ["Giảm thất lạc", "Giảm nhập lại", "Dễ đối chiếu"] },
  { asset: "department-reporting.svg", eyebrow: "Khoa điều trị", title: "Báo suất theo khoa và chế độ ăn", description: "Mỗi khoa gửi số lượng của đúng bữa, đúng mã ăn trước giờ chốt; phát sinh sau chốt được tách riêng.", audience: "Điều dưỡng", points: ["Theo bữa", "Theo mã ăn", "Theo giờ chốt"] },
  { asset: "nutrition-menu-flow.svg", eyebrow: "Dinh dưỡng", title: "Từ chế độ ăn đến thực đơn", description: "Món ăn được cấu trúc từ thực phẩm và thành phần dinh dưỡng; ăn thường và Sonde vận hành theo hai phạm vi riêng.", audience: "Khoa Dinh dưỡng", points: ["NORMAL", "SONDE", "Dữ liệu có nguồn"] },
  { asset: "cutoff-kitchen-flow.svg", eyebrow: "Chốt suất", title: "Bếp nhận đúng số cần chuẩn bị", description: "Số suất chính thức được chụp tại giờ chốt. Mọi phát sinh sau đó đi theo luồng bổ sung có dấu vết.", audience: "Bếp và Điều hành", points: ["Snapshot", "Không đổi ngầm", "Bổ sung riêng"] },
  { asset: "food-safety-flow.svg", eyebrow: "An toàn thực phẩm", title: "Chuẩn bị có bằng chứng", description: "Bếp theo dõi tiến độ, lưu ảnh món và ghi nhận mẫu lưu 24 giờ khi bệnh viện bật yêu cầu này.", audience: "Bếp", points: ["Ảnh món", "Thời gian", "Mẫu lưu 24h"] },
  { asset: "handoff-receipt.svg", eyebrow: "Giao nhận", title: "Đủ hay thiếu đều được ghi nhận", description: "Bếp bàn giao số suất theo khoa; điều dưỡng xác nhận nhận đủ hoặc ghi rõ thực nhận, chênh lệch và lý do.", audience: "Bếp và Khoa", points: ["FULL", "SHORT", "Hai đầu xác nhận"] },
  { asset: "operations-overview.svg", eyebrow: "Điều hành", title: "Một nơi để nắm toàn bộ vận hành", description: "Admin nhìn nhanh khoa đã báo, bếp đang chuẩn bị, phát sinh, bàn giao và kết quả nhận suất.", audience: "Ban giám đốc", points: ["Theo thời gian", "Cảnh báo rõ", "Không bịa trạng thái"] },
  { asset: "role-access.svg", eyebrow: "Phân quyền", title: "Mỗi vai trò làm đúng phần việc", description: "Admin, Dinh dưỡng, Điều dưỡng và Bếp có phạm vi thao tác riêng; tài khoản Bếp còn được tách NORMAL và SONDE.", audience: "Phòng CNTT", points: ["Role-based", "Theo khoa", "Theo route"] },
  { asset: "system-architecture.svg", eyebrow: "Kiến trúc", title: "Triển khai web gọn cho bệnh viện", description: "Người dùng mở bằng trình duyệt trên điện thoại hoặc máy tính; hệ thống chạy tập trung bằng Docker và PostgreSQL.", audience: "Phòng CNTT", points: ["HTTPS", "Docker", "Persistent storage"] },
  { asset: "audit-trail.svg", eyebrow: "Truy vết", title: "Biết con số đến từ đâu", description: "Mỗi thay đổi quan trọng gắn với người thao tác, thời điểm và dữ liệu trước sau để hỗ trợ kiểm tra khi cần.", audience: "Điều hành và IT", points: ["Ai", "Làm gì", "Lúc nào"] },
  { asset: "integration-future.svg", eyebrow: "Mở rộng", title: "Sẵn sàng kết nối trong tương lai", description: "Kiến trúc có thể mở rộng với HIS, dữ liệu dinh dưỡng, Excel, API và kênh thông báo; đây là định hướng tích hợp, không phải cam kết đã triển khai.", audience: "Lãnh đạo và IT", points: ["HIS", "RNI và Excel", "API và báo cáo"] },
] as const;

export function DemoSystemIntro() {
  return <section id="gioi-thieu-he-thong" className="demo-system-story" aria-labelledby="system-story-title">
    <header><p>Hệ thống giải quyết điều gì?</p><h2 id="system-story-title">Từ báo suất đến giao nhận, nhìn một lần là hiểu</h2><span>Mười hai sơ đồ độc lập dành cho lãnh đạo bệnh viện, các khoa nghiệp vụ và đội triển khai CNTT. Không dùng dữ liệu bệnh nhân thật.</span></header>
    <div className="demo-system-story-list">
      {stories.map((story, index) => <article key={story.asset} className="demo-system-story-item">
        <figure><Image src={`/intro/${story.asset}`} width={1200} height={700} sizes="(max-width: 820px) 100vw, 58vw" alt={`${story.title}. ${story.description}`}/></figure>
        <div><span className="demo-system-story-number">{String(index + 1).padStart(2, "0")}</span><p>{story.eyebrow} · {story.audience}</p><h3>{story.title}</h3><strong>{story.description}</strong><ul>{story.points.map((point) => <li key={point}>{point}</li>)}</ul></div>
      </article>)}
    </div>
  </section>;
}
