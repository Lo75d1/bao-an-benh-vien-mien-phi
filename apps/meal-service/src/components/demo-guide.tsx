"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleHelp, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { SessionUser } from "@/lib/auth";

const guides: Record<SessionUser["role"], Array<{ title: string; body: string; href: string; target?: string }>> = {
  NURSE: [{ title: "Chọn đúng đường nuôi", body: "Ăn thường và Sonde có lịch, giờ chốt và báo bổ sung riêng.", href: "/bao-suat", target: ".nurse-route-switch" }, { title: "Báo suất cho khoa", body: "Kiểm tra số lượng, ghi chú cho bếp rồi xác nhận người báo.", href: "/bao-suat", target: ".serving-editor" }, { title: "Xem lại trên lịch", body: "Mở từng bữa để kiểm tra thực đơn, số suất và giao nhận.", href: "/lich" }],
  DIETITIAN: [{ title: "Theo dõi vận hành", body: "Xem việc đang diễn ra và cảnh báo nghiệp vụ thực tế.", href: "/quan-ly" }, { title: "Chọn bữa cần làm", body: "Lịch bếp thường và Sonde tách riêng; ưu tiên bữa còn thiếu gần nhất.", href: "/thuc-don", target: "[data-demo-guide=nutrition-picker]" }, { title: "Lên và phân tích thực đơn", body: "Soạn nhiều mã trong một bữa, sau đó chuyển sang phần phân tích.", href: "/thuc-don", target: ".nutrition-menu-context" }],
  KITCHEN: [{ title: "Việc cần làm lúc này", body: "Giai đoạn tự đổi theo giờ; cảnh báo thực tế vẫn giữ đến khi xác nhận.", href: "/bep", target: ".kitchen-operation-main" }, { title: "Bổ sung và ghi chú", body: "Đọc ghi chú khoa, xác nhận suất bổ sung trước khi chuẩn bị.", href: "/bep", target: ".kitchen-quick-bar" }, { title: "Bằng chứng bữa ăn", body: "Chụp ảnh, xem lại hoặc chụp lại rồi mới xác nhận hoàn tất.", href: "/bep" }],
  ADMIN: [{ title: "Điều hành hôm nay", body: "Theo dõi khoa, mã chế độ, phát sinh và cảnh báo trong một màn.", href: "/quan-ly" }, { title: "Lịch toàn hệ thống", body: "Hai lịch ăn thường và Sonde độc lập nhưng dùng chung quy tắc thời gian.", href: "/lich" }, { title: "Cấu hình bệnh viện", body: "Tên, màu, giờ nghiệp vụ và danh mục đều có AuditLog.", href: "/quan-tri" }],
};

export function DemoGuide({ role }: { role: SessionUser["role"] }) {
  const pathname = usePathname();
  const steps = useMemo(() => guides[role], [role]);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const step = steps[index];
  useEffect(() => { const timer = window.setTimeout(() => setOpen(sessionStorage.getItem(`demo-guide:${role}`) !== "done"), 0); return () => window.clearTimeout(timer); }, [role]);
  useEffect(() => { document.querySelectorAll("[data-demo-highlight]").forEach((node) => node.removeAttribute("data-demo-highlight")); if (!open || !step.target || pathname !== step.href) return; const node = document.querySelector(step.target); node?.setAttribute("data-demo-highlight", "true"); return () => node?.removeAttribute("data-demo-highlight"); }, [open, pathname, step]);
  function close() { sessionStorage.setItem(`demo-guide:${role}`, "done"); setOpen(false); }
  if (!open) return <button className="demo-guide-reopen" type="button" onClick={() => { setIndex(0); setOpen(true); }}><CircleHelp/>Hướng dẫn</button>;
  return <aside className="demo-guide-card" aria-live="polite"><header><span>Hướng dẫn Demo · {index + 1}/{steps.length}</span><button type="button" onClick={close} aria-label="Thoát hướng dẫn"><X/></button></header><strong>{step.title}</strong><p>{step.body}</p><footer>{pathname === step.href ? <span>Thực hiện ngay trên màn này</span> : <Link href={step.href}>Mở đúng trang</Link>}<button type="button" onClick={() => index === steps.length - 1 ? close() : setIndex(index + 1)}>{index === steps.length - 1 ? "Hoàn tất" : "Tiếp theo"}</button></footer></aside>;
}
