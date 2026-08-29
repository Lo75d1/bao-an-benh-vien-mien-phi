"use client";

import Image from "next/image";
import { BookOpen, Clock3 } from "lucide-react";
import type { SessionUser } from "@/lib/auth";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type Guide = { title: string; responsibility: string; steps: string[]; times: string[] };

const GUIDES: Record<NonNullable<SessionUser["demoWorkspace"]>, Guide> = {
  NURSE: {
    title: "Điều dưỡng khoa báo suất và nhận bàn giao",
    responsibility: "Khoa chịu trách nhiệm gửi số suất trước giờ chốt, báo phát sinh sau chốt và xác nhận số thực nhận khi Bếp giao.",
    steps: ["Chọn đúng bữa và đường nuôi.", "Nhập số suất cho từng mã chế độ ăn rồi xác nhận gửi.", "Sau giờ chốt chỉ dùng Báo bổ sung; đến giờ phục vụ xác nhận nhận đủ hoặc nhận thiếu."],
    times: ["Trước giờ chốt: được nhập và sửa báo suất.", "Sau giờ chốt: số gốc đã khóa, phát sinh đi luồng bổ sung.", "Giờ phục vụ: khoa xác nhận kết quả giao nhận."],
  },
  DIETITIAN: {
    title: "Dinh dưỡng xây dựng và phân tích thực đơn",
    responsibility: "Dinh dưỡng chuẩn bị thực đơn theo từng mã chế độ ăn, kiểm tra thành phần và hoàn tất trước khi hệ thống tự khóa.",
    steps: ["Chọn đúng ngày, bữa và Bếp thường/Sonde.", "Nhập Excel hoặc tìm món, thực phẩm để xây dựng thực đơn.", "Mở Phân tích, kiểm tra cảnh báo dinh dưỡng rồi lưu bữa."],
    times: ["Lên thực đơn trước giờ khóa của bữa.", "Cảnh báo vàng vẫn được lưu; cảnh báo đỏ cần bổ sung dữ liệu thiết yếu.", "Đến giờ khóa, Bếp dùng đúng bản thực đơn đã lưu."],
  },
  KITCHEN_NORMAL: {
    title: "Bếp thường tiếp nhận và chuẩn bị suất ăn",
    responsibility: "Bếp theo dõi số suất khoa đã báo, phát sinh sau chốt, nguyên liệu và bằng chứng chuẩn bị của bữa ăn đường miệng.",
    steps: ["Kiểm tra số suất theo khoa và theo mã.", "Đối chiếu nguyên liệu, ghi chú và phát sinh được tiếp nhận.", "Chụp/chọn ảnh món, xác nhận sẵn sàng giao và lưu mẫu 24 giờ nếu cấu hình yêu cầu."],
    times: ["Trước giờ chuẩn bị: chỉ theo dõi, chưa thao tác Bếp.", "Giai đoạn chuẩn bị: hoàn thiện món và bằng chứng.", "Giờ phục vụ: theo dõi khoa xác nhận nhận suất."],
  },
  ADMIN: {
    title: "Quản trị theo dõi toàn bộ vận hành",
    responsibility: "Quản trị nhìn tổng hợp tiến độ các khoa, mã chế độ, Bếp và cấu hình hệ thống mà không thay thế thao tác chuyên môn thông thường.",
    steps: ["Chọn ngày và bữa cần theo dõi.", "Xem khoa đã báo, số suất, phát sinh và trạng thái Bếp.", "Dùng Lịch tuần, Báo cáo, Thực đơn và Quản trị khi cần đi sâu."],
    times: ["Giai đoạn theo giờ tự đổi theo lịch cấu hình.", "Business facts chỉ đổi khi đúng vai trò thao tác thành công.", "Dùng Tua thời gian Demo để kiểm tra cách bảng điều hành đổi giai đoạn."],
  },
  KITCHEN_SONDE: {
    title: "Bếp Sonde vận hành theo lịch cữ riêng",
    responsibility: "Sonde có giờ cữ, số lượng và thực đơn độc lập với Bếp ăn thường; dữ liệu không được trộn giữa hai đường nuôi.",
    steps: ["Chọn đúng cữ Sonde đang xử lý.", "Kiểm tra số lượng, công thức và nguyên liệu của cữ.", "Ghi nhận ảnh, trạng thái chuẩn bị và mẫu lưu theo cấu hình."],
    times: ["Mỗi cữ Sonde có giờ chốt và giờ phục vụ riêng.", "Báo bổ sung Sonde chỉ đi tới Bếp Sonde.", "Tua thời gian trên trang Sonde không đổi giờ của workspace khác."],
  },
};

export function DemoGuide({ user }: { user: SessionUser }) {
  const workspace = user.demoWorkspace;
  if (!workspace) return null;
  const guide = GUIDES[workspace];
  return <Dialog><DialogTrigger asChild><button className="demo-guide-reopen" type="button"><BookOpen/>Hướng dẫn sử dụng</button></DialogTrigger><DialogContent className="demo-usage-dialog"><DialogHeader><DialogTitle>{guide.title}</DialogTitle><DialogDescription>{guide.responsibility}</DialogDescription></DialogHeader><div className="demo-usage-layout"><figure><Image src="/demo-quan-he-phoi-hop-suat-an.png" width={1536} height={1024} sizes="(max-width: 760px) 92vw, 520px" alt="Sơ đồ phối hợp giữa khoa, dinh dưỡng, bếp và quản trị"/><figcaption>Dữ liệu được bàn giao giữa các vai trò trong cùng một Demo Session.</figcaption></figure><div className="demo-usage-copy"><section><span>3 bước chính</span><ol>{guide.steps.map((step, index) => <li key={step}><b>{index + 1}</b><p>{step}</p></li>)}</ol></section><section><span><Clock3/>Mốc giờ cần nhớ</span><ul>{guide.times.map((item) => <li key={item}>{item}</li>)}</ul></section><p className="demo-usage-tip">Muốn thử giai đoạn khác, mở <strong>Tua thời gian</strong> trên header. Thời gian chỉ áp dụng cho trang hiện tại và không tự tạo trạng thái hoàn thành.</p></div></div></DialogContent></Dialog>;
}
