"use client";

import Image from "next/image";
import { BookOpen } from "lucide-react";
import type { SessionUser } from "@/lib/auth";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { realFlowSlides } from "@/components/demo-real-flow-slideshow";

const ROLE_TITLE: Record<NonNullable<SessionUser["demoWorkspace"]>, string> = {
  NURSE: "Điều dưỡng: báo suất, phát sinh và nhận bàn giao",
  DIETITIAN: "Dinh dưỡng: thực đơn, điều hành, kho và báo cáo",
  KITCHEN_NORMAL: "Bếp thường: chuẩn bị, ảnh món và bàn giao",
  ADMIN: "Admin: cấu hình, QR, tài khoản và theo dõi",
  KITCHEN_SONDE: "Bếp Sonde: vận hành cữ riêng",
};

const WORKSPACE_SLIDES: Record<NonNullable<SessionUser["demoWorkspace"]>, readonly number[]> = {
  NURSE: [17, 1, 2, 3, 13, 14],
  DIETITIAN: [14, 8, 9, 10, 11, 12, 13, 7],
  KITCHEN_NORMAL: [4, 6, 5, 2, 3],
  ADMIN: [15, 16, 14, 12, 13, 7],
  KITCHEN_SONDE: [4, 6, 5, 13],
};

function slidesFor(workspace: NonNullable<SessionUser["demoWorkspace"]>) {
  const byPosition = new Map(realFlowSlides.map((slide, index) => [index + 1, slide]));
  return WORKSPACE_SLIDES[workspace].flatMap((position) => {
    const slide = byPosition.get(position);
    return slide ? [{ ...slide, positionNumber: position }] : [];
  });
}

export function DemoGuide({ user }: { user: SessionUser }) {
  const workspace = user.demoWorkspace;
  if (!workspace) return null;
  const slides = slidesFor(workspace);
  return <Dialog><DialogTrigger asChild><button className="demo-guide-reopen" type="button"><BookOpen/>Hướng dẫn sử dụng</button></DialogTrigger><DialogContent className="demo-usage-dialog"><DialogHeader><DialogTitle>{ROLE_TITLE[workspace]}</DialogTitle><DialogDescription>Vuốt ngang để xem ảnh màn hình thật. Hướng dẫn này dùng chính 17 hình Demo, không ép người dùng đọc quy trình dài.</DialogDescription></DialogHeader>
    <div className="demo-usage-scroll">
      <div className="demo-usage-photo-track" aria-label="Ảnh hướng dẫn theo vai trò">
        {slides.map((slide) => <figure key={`${workspace}-${slide.image}`} className="demo-usage-photo-card">
          <Image src={`/intro/${slide.image}`} width={1920} height={1080} sizes="(max-width: 760px) 86vw, 520px" alt={`${slide.position}: ${slide.title}`}/>
          <figcaption><span>{String(slide.positionNumber).padStart(2, "0")} · {slide.role} · {slide.page}</span><strong>{slide.title}</strong><small>{slide.description}</small></figcaption>
        </figure>)}
      </div>
      <p className="demo-usage-tip">Mẹo test nhanh: mở <strong>Tua thời gian</strong> trên header để chuyển giai đoạn, rồi đối chiếu màn hình với ảnh hướng dẫn. Mỗi thao tác vẫn phải do đúng vai trò thực hiện.</p>
    </div>
  </DialogContent></Dialog>;
}
