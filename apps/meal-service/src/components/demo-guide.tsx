"use client";

import { usePathname, useRouter } from "next/navigation";
import { CircleHelp, Clock3, LoaderCircle, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { updateDemoClockAction } from "@/app/(app)/demo-clock-actions";
import { useDemoClock } from "@/components/demo-clock-context";
import type { SessionUser } from "@/lib/auth";

type GuideStep = { title: string; body: string; href: string; target?: string; time?: string; timeLabel?: string };

const guides: Record<string, GuideStep[]> = {
  NURSE: [
    { title: "Chọn đúng đường nuôi", body: "Bấm trực tiếp Ăn thường hoặc Qua Sonde. Hai luồng có lịch và giờ chốt độc lập.", href: "/bao-suat", target: ".nurse-route-switch", time: "08:20", timeLabel: "Trước giờ chốt" },
    { title: "Báo suất cho khoa", body: "Nhập số suất ở từng mã, thêm ghi chú bếp rồi bấm xác nhận báo suất.", href: "/bao-suat", target: ".serving-editor", time: "08:30", timeLabel: "Đang báo suất" },
    { title: "Báo bổ sung sau chốt", body: "Sau giờ chốt, bảng gốc được khóa. Bấm Báo bổ sung và nhập mã, số suất, lý do.", href: "/bao-suat", target: ".nurse-locked-actions", time: "09:30", timeLabel: "Bếp đang chuẩn bị" },
    { title: "Xác nhận khoa đã nhận", body: "Khi phục vụ, bấm xác nhận nhận đủ hoặc khai số thực nhận và lý do nếu thiếu.", href: "/bao-suat", target: "[data-demo-guide=delivery-receipt]", time: "11:05", timeLabel: "Đang phục vụ" },
  ],
  DIETITIAN: [
    { title: "Chọn bữa còn thiếu gần nhất", body: "Bấm lịch Bếp thường hoặc Sonde rồi chọn đúng bữa cần lên thực đơn.", href: "/thuc-don", target: "[data-demo-guide=nutrition-picker]" },
    { title: "Nhập nhanh từ Excel", body: "Bấm Nhập Excel, ghép các cột và xem trước từng hàng trước khi đưa vào bản nháp.", href: "/thuc-don", target: "[data-demo-guide=excel-import]" },
    { title: "Soạn thực đơn nhiều mã", body: "Bấm mã để xem khuyến nghị; dùng ô tìm kiếm để thêm món hoặc thực phẩm vào đúng mã.", href: "/thuc-don", target: ".nutrition-menu-context" },
    { title: "Phân tích trước khi khóa", body: "Chuyển sang Phân tích để đối chiếu trung bình một suất và dữ liệu khuyến nghị còn thiếu.", href: "/thuc-don", target: ".nutrition-menu-context" },
  ],
  KITCHEN_NORMAL: [
    { title: "Bếp chỉ bắt đầu đúng giờ", body: "Trước giờ chuẩn bị, các nút nghiệp vụ bị khóa. Xem số suất và ghi chú để chủ động.", href: "/bep", target: ".kitchen-operation-main", time: "09:20", timeLabel: "Chưa tới giờ chuẩn bị" },
    { title: "Đọc ghi chú và suất bổ sung", body: "Bấm Ghi chú hoặc Bổ sung, đọc nội dung rồi xác nhận bếp đã tiếp nhận.", href: "/bep", target: ".kitchen-quick-bar", time: "09:35", timeLabel: "Đang chuẩn bị" },
    { title: "Kiểm tra nguyên liệu", body: "Bấm từng mã để xem món, khối lượng mỗi suất và bảng thực phẩm cần dùng.", href: "/bep", target: ".kitchen-operation-side" },
    { title: "Chụp bằng chứng hoàn tất", body: "Bấm Đã chuẩn bị xong, chụp hoặc chọn ảnh, xem lại rồi mới xác nhận tất cả.", href: "/bep", target: ".kitchen-complete", time: "10:45", timeLabel: "Chuẩn bị hoàn tất" },
  ],
  KITCHEN_SONDE: [
    { title: "Lịch Sonde độc lập", body: "Mỗi cữ Sonde có giờ riêng, không dùng giờ của bếp ăn thường.", href: "/bep", target: ".kitchen-operation-main", time: "09:20", timeLabel: "Trước cữ Sonde" },
    { title: "Tiếp nhận bổ sung Sonde", body: "Bấm Bổ sung để xác nhận đúng cữ. Việc khóa bếp thường không khóa báo bổ sung Sonde.", href: "/bep", target: ".kitchen-quick-bar", time: "09:35", timeLabel: "Chuẩn bị cữ Sonde" },
    { title: "Kiểm tra công thức", body: "Bấm từng mã để xem công thức, khối lượng và tổng nhu cầu của cữ.", href: "/bep", target: ".kitchen-operation-side" },
    { title: "Lưu bằng chứng đúng cữ", body: "Chụp ảnh và xác nhận hoàn tất cho đúng cữ Sonde đang làm.", href: "/bep", target: ".kitchen-complete", time: "10:45", timeLabel: "Hoàn tất cữ" },
  ],
  ADMIN: [
    { title: "Điều hành đúng bữa hiện tại", body: "Bấm từng khoa hoặc mã chế độ để xem trạng thái, số suất và phát sinh.", href: "/quan-ly", target: ".admin-serving-master", time: "09:35", timeLabel: "Bếp đang chuẩn bị" },
    { title: "Theo dõi cảnh báo thực tế", body: "Giai đoạn tự đổi theo giờ nhưng khoa hoặc bếp chưa hoàn tất vẫn được cảnh báo riêng.", href: "/quan-ly", target: ".shared-lifecycle", time: "11:05", timeLabel: "Đang phục vụ" },
    { title: "Xem lại trên lịch", body: "Bấm một ô bữa để xem khoa báo, thực đơn, số suất và ảnh bằng chứng.", href: "/lich", target: ".calendar-status-table" },
    { title: "Cấu hình giờ và danh mục", body: "Đổi nhận diện, lịch bếp thường, lịch Sonde và danh mục nghiệp vụ tại đây.", href: "/quan-tri", target: ".admin-workspace" },
  ],
};

const nextRole: Record<string, { label: string; email: string; password: string; href: string } | undefined> = {
  "nurse@demo.local": { label: "Dinh dưỡng viên", email: "dietitian@demo.local", password: "Demo-Dietitian-2026!", href: "/thuc-don" },
  "dietitian@demo.local": { label: "Bếp ăn thường", email: "kitchen@demo.local", password: "Demo-Kitchen-2026!", href: "/bep" },
  "kitchen@demo.local": { label: "Bếp Sonde", email: "sonde@demo.local", password: "Demo-Sonde-2026!", href: "/bep" },
  "sonde@demo.local": { label: "Quản trị", email: "admin@demo.local", password: "Demo-Admin-2026!", href: "/quan-ly" },
};

function guideKey(user: SessionUser) { return user.role === "KITCHEN" ? user.kitchenRoute === "SONDE" ? "KITCHEN_SONDE" : "KITCHEN_NORMAL" : user.role; }
function vietnamDate(iso: string) { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso)); }
function vietnamTime(iso: string) { return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso)); }

export function DemoGuide({ user }: { user: SessionUser }) {
  const pathname = usePathname(); const router = useRouter(); const clock = useDemoClock();
  const key = guideKey(user); const steps = useMemo(() => guides[key] ?? [], [key]);
  const [open, setOpen] = useState(false); const [index, setIndex] = useState(0); const [switching, setSwitching] = useState(false); const [full, setFull] = useState(false);
  const step = steps[index] ?? steps[0]; const following = nextRole[user.email];
  const isStepTime = Boolean(step?.time && clock && vietnamTime(clock.nowIso) === step.time);
  useEffect(() => { const timer = window.setTimeout(() => { const saved = Number(sessionStorage.getItem(`demo-guide-index:${user.email}`) ?? 0); setIndex(Number.isInteger(saved) && saved < steps.length ? saved : 0); setFull(sessionStorage.getItem("demo-tour-mode") === "full"); setOpen(sessionStorage.getItem(`demo-guide:${key}`) !== "done"); }, 0); return () => window.clearTimeout(timer); }, [key, steps.length, user.email]);
  useEffect(() => { document.querySelectorAll("[data-demo-highlight]").forEach((node) => node.removeAttribute("data-demo-highlight")); if (!open || !step?.target || pathname !== step.href) return; const node = document.querySelector(step.target); node?.setAttribute("data-demo-highlight", "true"); node?.scrollIntoView({ block: "center", behavior: "smooth" }); return () => node?.removeAttribute("data-demo-highlight"); }, [open, pathname, step]);
  if (!step) return null;
  function close() { sessionStorage.setItem(`demo-guide:${key}`, "done"); sessionStorage.removeItem(`demo-guide-index:${user.email}`); setOpen(false); }
  function advance() { if (index === steps.length - 1) { close(); return; } const next = index + 1; sessionStorage.setItem(`demo-guide-index:${user.email}`, String(next)); setIndex(next); if (steps[next].href !== pathname) router.push(steps[next].href); }
  async function changeRole() { if (!following) { close(); return; } setSwitching(true); sessionStorage.removeItem(`demo-guide-index:${following.email}`); const response = await fetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(following) }); if (!response.ok) { setSwitching(false); return; } window.location.assign(following.href); }
  if (!open) return <button className="demo-guide-reopen" type="button" onClick={() => { setIndex(0); sessionStorage.setItem(`demo-guide-index:${user.email}`, "0"); setOpen(true); }}><CircleHelp/>Hướng dẫn</button>;
  return <aside key={`${key}:${index}`} className="demo-guide-card" aria-live="polite"><header><span>Hướng dẫn Demo · {index + 1}/{steps.length}</span><button type="button" onClick={close} aria-label="Thoát hướng dẫn"><X/></button></header><strong>{step.title}</strong><p>{step.body}</p>{step.time && clock ? <form action={updateDemoClockAction} className={isStepTime ? "demo-guide-time current" : "demo-guide-time"} onSubmit={() => sessionStorage.setItem(`demo-guide-index:${user.email}`, String(index))}><input type="hidden" name="returnTo" value={step.href}/><input type="hidden" name="mode" value="SET"/><input type="hidden" name="now" value={`${vietnamDate(clock.nowIso)}T${step.time}`}/><button type="submit" disabled={isStepTime}><Clock3/><span>{step.timeLabel}</span><strong>{isStepTime ? `Đang ở ${step.time}` : `Chuyển đến ${step.time}`}</strong></button></form> : null}<footer><span>{step.time && !isStepTime ? "Đổi mốc phía trên khi muốn mô phỏng. Tiếp tục không đổi giờ." : pathname === step.href ? step.target ? "Ô cần thao tác đang được làm nổi bật" : "Thực hiện trên màn này" : "Sẽ mở đúng màn hình ở bước tiếp"}</span>{index === steps.length - 1 && full && following ? <button type="button" onClick={changeRole} disabled={switching}>{switching ? <LoaderCircle className="animate-spin"/> : null}Sang {following.label}</button> : <button type="button" onClick={advance} title="Chỉ chuyển bước hướng dẫn, không đổi giờ">{index === steps.length - 1 ? "Hoàn tất" : "Tiếp tục"}</button>}</footer></aside>;
}
