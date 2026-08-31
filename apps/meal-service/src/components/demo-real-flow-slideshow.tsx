import Image from "next/image";

export const realFlowSlides = [
  {
    image: "real-flow-01.jpg",
    position: "Vị trí 01",
    role: "Điều dưỡng",
    page: "/bao-suat",
    title: "Báo bổ sung cho bữa Chiều",
    description: "Modal nhập phát sinh đúng bữa đang xử lý, chọn mã chế độ ăn, số suất và lý do.",
  },
  {
    image: "real-flow-02.jpg",
    position: "Vị trí 02",
    role: "Điều dưỡng",
    page: "/bao-suat",
    title: "Chờ Bếp bàn giao",
    description: "Khoa thấy trạng thái chờ bàn giao, chưa hiện nút xác nhận khi Bếp chưa giao.",
  },
  {
    image: "real-flow-03.jpg",
    position: "Vị trí 03",
    role: "Điều dưỡng",
    page: "/bao-suat",
    title: "Xác nhận giao nhận",
    description: "Sau khi có bàn giao, Điều dưỡng xác nhận nhận đủ hoặc thiếu suất từ Bếp.",
  },
  {
    image: "real-flow-04.jpg",
    position: "Vị trí 04",
    role: "Bếp thường",
    page: "/bep",
    title: "Tổng suất & tiến độ chuẩn bị",
    description: "Bếp xem tổng suất theo mã chế độ ăn, suất bổ sung, bằng chứng và ghi chú đã duyệt.",
  },
  {
    image: "real-flow-05.jpg",
    position: "Vị trí 05",
    role: "Bếp thường",
    page: "/bep",
    title: "Bàn giao cho khoa",
    description: "Khu vực bàn giao cho từng khoa, hiển thị số khoa đã nhận và nút bàn giao.",
  },
  {
    image: "real-flow-06.jpg",
    position: "Vị trí 06",
    role: "Bếp thường",
    page: "/bep",
    title: "Ảnh món theo mã chế độ ăn",
    description: "Modal chụp/chọn ảnh thực tế cho từng mã trước khi xác nhận sẵn sàng giao.",
  },
  {
    image: "real-flow-07.jpg",
    position: "Vị trí 07",
    role: "Dinh dưỡng",
    page: "/kho",
    title: "Kho chứng từ",
    description: "Trang lưu hóa đơn, ảnh/PDF chứng từ và danh sách hóa đơn đã lưu.",
  },
  {
    image: "real-flow-08.jpg",
    position: "Vị trí 08",
    role: "Dinh dưỡng",
    page: "/thuc-don",
    title: "Lên thực đơn theo mã",
    description: "Tạo thực đơn cho từng mã chế độ ăn, tách đúng bữa và đường ăn.",
  },
  {
    image: "real-flow-09.jpg",
    position: "Vị trí 09",
    role: "Dinh dưỡng",
    page: "/thuc-don",
    title: "Nhập thực đơn từ Excel",
    description: "Modal nhập Excel có vùng chọn tệp, tải mẫu và bước đưa hàng vào thực đơn.",
  },
  {
    image: "real-flow-10.jpg",
    position: "Vị trí 10",
    role: "Dinh dưỡng",
    page: "/thuc-don",
    title: "Tìm món và thêm vào mã",
    description: "Danh sách món gợi ý hiển thị ngay trong editor, giữ context mã đang chỉnh.",
  },
  {
    image: "real-flow-11.jpg",
    position: "Vị trí 11",
    role: "Dinh dưỡng",
    page: "/thuc-don",
    title: "Sao chép từ bữa khác",
    description: "Chọn bữa nguồn có thực đơn để copy vào bữa đích mà không đổi context đang làm.",
  },
  {
    image: "real-flow-12.jpg",
    position: "Vị trí 12",
    role: "Dinh dưỡng",
    page: "/bao-cao",
    title: "Báo cáo vận hành",
    description: "Chọn nhóm dữ liệu, xem trước, xuất Excel/PDF/In và xem dữ liệu bằng chứng.",
  },
  {
    image: "real-flow-13.jpg",
    position: "Vị trí 13",
    role: "Dinh dưỡng",
    page: "/lich",
    title: "Lịch tuần",
    description: "Theo dõi trạng thái từng bữa trong tuần, bữa hiện hành và thực đơn đã chốt.",
  },
  {
    image: "real-flow-14.jpg",
    position: "Vị trí 14",
    role: "Dinh dưỡng",
    page: "/quan-ly",
    title: "Vận hành toàn viện",
    description: "Bảng theo khoa hiển thị trạng thái nghiệp vụ, số suất, phát sinh và giao nhận.",
  },
  {
    image: "real-flow-15.jpg",
    position: "Vị trí 15",
    role: "Quản trị",
    page: "/quan-tri",
    title: "Nhận diện bệnh viện",
    description: "Cấu hình tên hiển thị, logo, màu hệ thống và trang chủ công khai.",
  },
  {
    image: "real-flow-16.jpg",
    position: "Vị trí 16",
    role: "Quản trị",
    page: "/quan-tri",
    title: "Nhân sự và mã chế độ",
    description: "Quản lý tài khoản, vai trò, phạm vi bếp và danh mục chế độ ăn.",
  },
  {
    image: "real-flow-17.jpg",
    position: "Vị trí 17",
    role: "Điều dưỡng",
    page: "/bao-suat",
    title: "Báo suất ăn",
    description: "Điều dưỡng cập nhật số suất theo mã, xem thay đổi và xác nhận cập nhật.",
  },
] as const;

export function DemoRealFlowSlideshow() {
  return (
    <section className="demo-real-flow" aria-labelledby="demo-real-flow-title">
      <header>
        <p>Ảnh thực tế Demo</p>
        <h2 id="demo-real-flow-title">Một ô slide cho toàn bộ vị trí sử dụng</h2>
        <span>
          Vuốt ngang để xem từng màn hình thực tế: Điều dưỡng, Dinh dưỡng, Bếp thường và Quản trị.
          Mỗi ảnh đều có nhãn vị trí để bệnh viện dễ đối chiếu khi trải nghiệm Demo.
        </span>
      </header>

      <div className="demo-real-flow-shell">
        <div className="demo-real-flow-track" aria-label="Slide ảnh thực tế hệ thống">
          {realFlowSlides.map((slide, index) => (
            <figure id={`anh-thuc-te-${index + 1}`} key={slide.image} className="demo-real-flow-slide">
              <Image
                src={`/intro/${slide.image}`}
                width={1920}
                height={1080}
                sizes="(max-width: 760px) 92vw, 980px"
                alt={`${slide.position}: ${slide.role} - ${slide.title}`}
              />
              <figcaption>
                <span>{slide.position} · {slide.role} · {slide.page}</span>
                <strong>{slide.title}</strong>
                <small>{slide.description}</small>
              </figcaption>
            </figure>
          ))}
        </div>

        <nav className="demo-real-flow-positions" aria-label="Chọn nhanh vị trí ảnh">
          {realFlowSlides.map((slide, index) => (
            <a key={slide.image} href={`#anh-thuc-te-${index + 1}`} aria-label={`Xem ${slide.position}: ${slide.title}`}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{slide.role}</strong>
            </a>
          ))}
        </nav>
      </div>
    </section>
  );
}
