"use client";

import Image from "next/image";
import { BookOpen, Clock3 } from "lucide-react";
import type { SessionUser } from "@/lib/auth";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getTranslations, readClientLocale } from "@/lib/locale";

type Guide = { title: string; responsibility: string; steps: string[]; times: string[] };

const GUIDES = {
  vi: {
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
      responsibility: "Quản trị nhìn tổng hợp tiến độ các khoa, mã chế độ, Bếp và cấu hình hệ thống mà không thay thế thao tác chuyên môn thường ngày.",
      steps: ["Chọn ngày và bữa cần theo dõi.", "Xem khoa đã báo, số suất, phát sinh và trạng thái Bếp.", "Dùng Lịch tuần, Báo cáo, Thực đơn và Quản trị khi cần đi sâu."],
      times: ["Giai đoạn theo giờ tự đổi theo lịch cấu hình.", "Business facts chỉ đổi khi đúng vai trò thao tác thành công.", "Dùng Tua thời gian Demo để kiểm tra cách bảng điều hành đổi giai đoạn."],
    },
    KITCHEN_SONDE: {
      title: "Bếp Sonde vận hành theo lịch cư riêng",
      responsibility: "Sonde có giờ chốt, số lượng và thực đơn độc lập với Bếp ăn thường; dữ liệu không được trộn giữa hai đường nuôi.",
      steps: ["Chọn đúng cữ Sonde đang xử lý.", "Kiểm tra số lượng, công thức và nguyên liệu của cữ.", "Ghi nhận ảnh, trạng thái chuẩn bị và mẫu lưu theo cấu hình."],
      times: ["Mỗi cữ Sonde có giờ chốt và giờ phục vụ riêng.", "Báo bổ sung Sonde chỉ đi tới Bếp Sonde.", "Tua thời gian trên trang Sonde không đổi giờ của workspace khác."],
    },
  },
  en: {
    NURSE: {
      title: "Nursing meal counts and handoff",
      responsibility: "The ward is responsible for sending counts before the cutoff, reporting late changes after cutoff, and confirming what was actually received when the kitchen delivers.",
      steps: ["Choose the correct meal and feeding route.", "Enter the count for each diet code, then submit.", "After cutoff, use only the supplemental report; at service time, confirm full or partial receipt."],
      times: ["Before cutoff: counts can be entered and edited.", "After cutoff: the base count is locked and changes move to the supplemental flow.", "At service time: the ward confirms the delivery result."],
    },
    DIETITIAN: {
      title: "Dietitians build and review menus",
      responsibility: "Dietitians prepare menus per diet code, verify ingredients, and finish before the system locks them automatically.",
      steps: ["Choose the correct date, meal, and Normal/Tube kitchen.", "Import Excel or search dishes and ingredients to build the menu.", "Open analysis, review nutrition warnings, then save the meal."],
      times: ["Plan menus before the meal lock time.", "Yellow warnings may still be saved; red warnings need missing essentials added.", "At lock time, the kitchen uses the saved menu version."],
    },
    KITCHEN_NORMAL: {
      title: "Normal kitchen receives and prepares meals",
      responsibility: "The kitchen tracks ward counts, late changes, ingredients, and preparation evidence for the oral-feeding meal.",
      steps: ["Check counts by ward and diet code.", "Review ingredients, notes, and accepted late changes.", "Capture or choose a dish photo, mark it ready, and keep a 24-hour sample if configured."],
      times: ["Before preparation: monitor only, no kitchen action yet.", "During preparation: finish the dishes and evidence.", "At service time: watch the ward confirm receipt."],
    },
    ADMIN: {
      title: "Admins oversee the whole operation",
      responsibility: "Admins see progress across wards, diet codes, the kitchen, and system settings without replacing day-to-day specialist actions.",
      steps: ["Choose the day and meal to monitor.", "Review wards reported, counts, late changes, and kitchen status.", "Use Weekly schedule, Reports, Menus, and Admin when you need a deeper view."],
      times: ["The status stages change with the configured schedule.", "Business facts change only when the correct role completes the action.", "Use Demo time travel to see how the board shifts by stage."],
    },
    KITCHEN_SONDE: {
      title: "Tube-feeding kitchen runs on its own schedule",
      responsibility: "Tube feeding has its own cutoff, quantity, and menu, separate from the normal kitchen; the data must not mix between feeding routes.",
      steps: ["Choose the current tube-feeding batch.", "Check the quantity, formula, and ingredients for that batch.", "Record images, preparation status, and stored samples per configuration."],
      times: ["Each tube-feeding batch has its own cutoff and service time.", "Tube supplemental reports go only to the tube kitchen.", "Time travel on the tube page does not change another workspace’s clock."],
    },
  },
} as const satisfies Record<string, Record<string, Guide>>;

export function DemoGuide({ user }: { user: SessionUser }) {
  const workspace = user.demoWorkspace;
  if (!workspace) return null;
  const locale = readClientLocale();
  const texts = getTranslations(locale);
  const guide =
    workspace === "NURSE"
      ? GUIDES[locale].NURSE
      : workspace === "DIETITIAN"
        ? GUIDES[locale].DIETITIAN
        : workspace === "KITCHEN_NORMAL"
          ? GUIDES[locale].KITCHEN_NORMAL
          : workspace === "ADMIN"
            ? GUIDES[locale].ADMIN
            : GUIDES[locale].KITCHEN_SONDE;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="demo-guide-reopen" type="button">
          <BookOpen />
          {locale === "vi" ? "Hướng dẫn sử dụng" : "How it works"}
        </button>
      </DialogTrigger>
      <DialogContent className="demo-usage-dialog">
        <DialogHeader>
          <DialogTitle>{guide.title}</DialogTitle>
          <DialogDescription>{guide.responsibility}</DialogDescription>
        </DialogHeader>
        <div className="demo-usage-layout">
          <figure>
            <Image
              src="/demo-quan-he-phoi-hop-suat-an.png"
              width={1536}
              height={1024}
              sizes="(max-width: 760px) 92vw, 520px"
              alt={locale === "vi" ? "Sơ đồ phối hợp giữa khoa, dinh dưỡng, bếp và quản trị" : "Coordination map for wards, dietitians, kitchen, and admin"}
            />
            <figcaption>
              {locale === "vi"
                ? "Dữ liệu được bàn giao giữa các vai trò trong cùng một Demo Session."
                : "Data is handed off between roles within the same Demo Session."}
            </figcaption>
          </figure>
          <div className="demo-usage-copy">
            <section>
              <span>{locale === "vi" ? "3 bước chính" : "3 main steps"}</span>
              <ol>
                {guide.steps.map((step, index) => (
                  <li key={step}>
                    <b>{index + 1}</b>
                    <p>{step}</p>
                  </li>
                ))}
              </ol>
            </section>
            <section>
              <span>
                <Clock3 />
                {locale === "vi" ? "Mốc giờ cần nhớ" : "Key timing points"}
              </span>
              <ul>
                {guide.times.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
            <p className="demo-usage-tip">
              {locale === "vi"
                ? <>
                    Muốn thử giai đoạn khác, mở <strong>Tua thời gian</strong> trên header. Thời gian chỉ áp dụng cho trang hiện tại và không tự tạo trạng thái hoàn thành.
                  </>
                : <>
                    To try a different stage, open <strong>Time travel</strong> from the header. The time change applies only to the current page and does not auto-create completion state.
                  </>}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
