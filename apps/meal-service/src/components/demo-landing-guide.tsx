"use client";

import { ArrowRight, X } from "lucide-react";
import { useEffect, useState } from "react";

const STEPS = [
  { target: "[data-landing-guide=intro]", title: "Một bữa, một luồng dữ liệu", copy: "Bệnh viện theo dõi cùng một bữa từ báo suất, chốt số liệu, chuẩn bị, phục vụ đến xác nhận giao nhận." },
  { target: "[data-landing-guide=timeline]", title: "Timeline theo giờ, fact theo thao tác", copy: "Giờ hệ thống cho biết đang ở giai đoạn nào; kết quả thật chỉ xuất hiện khi đúng vai trò thao tác và lưu thành công." },
  { target: "[data-landing-guide=workspaces]", title: "Năm workspace phối hợp", copy: "Điều dưỡng, Dinh dưỡng, Bếp thường, Quản trị và Sonde dùng chung dữ liệu Demo nhưng có quyền và nhiệm vụ riêng." },
  { target: "[data-landing-guide=start]", title: "Bắt đầu thực hành", copy: "Vào Demo để thao tác thật. Hướng dẫn trong từng workspace sẽ tự chọn đúng bữa và mốc giờ mô phỏng." },
] as const;

export function DemoLandingGuide() {
  const [step, setStep] = useState<number | null>(null);
  const current = step === null ? null : STEPS[step];
  useEffect(() => {
    document.querySelectorAll("[data-demo-highlight]").forEach((node) => node.removeAttribute("data-demo-highlight"));
    if (!current) return;
    const target = document.querySelector(current.target);
    if (!target) return;
    target.setAttribute("data-demo-highlight", "true");
    target.scrollIntoView({ block: "center", behavior: "smooth" });
    return () => target.removeAttribute("data-demo-highlight");
  }, [current]);
  if (!current) return <button className="demo-landing-guide-start" type="button" onClick={() => setStep(0)}>Xem hướng dẫn Demo<ArrowRight/></button>;
  return <aside className="demo-landing-guide-card" aria-live="polite"><header><span>Giới thiệu · {step! + 1}/{STEPS.length}</span><button type="button" aria-label="Thoát giới thiệu Demo" onClick={() => setStep(null)}><X/></button></header><strong>{current.title}</strong><p>{current.copy}</p><footer><button type="button" onClick={() => setStep(null)}>Thoát</button><button type="button" onClick={() => step === STEPS.length - 1 ? setStep(null) : setStep(step! + 1)}>{step === STEPS.length - 1 ? "Bắt đầu trải nghiệm" : "Tiếp theo"}<ArrowRight/></button></footer></aside>;
}
