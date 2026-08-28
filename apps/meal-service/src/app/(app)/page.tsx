/* eslint-disable @next/next/no-img-element -- public evidence URL comes from configured storage */
import Image from "next/image";
import type { CSSProperties } from "react";
import { Clock3, ImageOff, LogIn, MessageSquareText, Utensils } from "lucide-react";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getSessionUser } from "@/lib/auth";
import { blendHex, readBrandingSettings, readableForeground } from "@/lib/branding";
import { readPublicDietMenu } from "@/lib/patient-note";
import { readPublicViewStats } from "@/lib/public-page-views";
import { PublicViewTracker } from "@/components/public-view-tracker";
import { submitPublicPatientNoteAction } from "@/app/patient-note-actions";

const dateLabel = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
const numberFormat = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });

export default async function HomePage({ searchParams }: { searchParams: Promise<{ diet?: string; date?: string; patient?: string; note?: string }> }) {
  const query = await searchParams;
  const [user, branding, menu, views] = await Promise.all([getSessionUser({ allowPasswordChange: true }), readBrandingSettings(), readPublicDietMenu(query.diet, query.date), readPublicViewStats()]);
  if (user) redirect(user.mustChangePassword ? "/ho-so?first=1" : { ADMIN: "/quan-ly", DIETITIAN: "/quan-ly", NURSE: "/bao-suat", KITCHEN: "/bep" }[user.role]);

  const publicForeground = readableForeground(branding.publicPrimaryColor);
  const publicStyle = { "--public-primary": branding.publicPrimaryColor, "--public-accent": branding.publicAccentColor, "--public-primary-foreground": publicForeground, "--primary": branding.publicPrimaryColor, "--primary-foreground": publicForeground, "--accent": branding.publicAccentColor, "--accent-foreground": readableForeground(branding.publicAccentColor), "--ring": branding.publicAccentColor, "--brand-surface": branding.publicPrimaryColor, "--brand-foreground": publicForeground, "--secondary": blendHex(branding.publicPrimaryColor, "#FFFFFF", .9) } as CSSProperties;
  const publicHeroImage = branding.publicHeroImageDataUrl ?? "/hospital-meal-hero.png";
  const heroStyle = branding.publicHeroEnabled ? { backgroundImage: `linear-gradient(90deg,rgba(248,251,253,.97) 0%,rgba(248,251,253,.91) 45%,rgba(248,251,253,.12) 100%),url("${publicHeroImage}")` } : undefined;

  return <main className="public-menu-home" style={publicStyle}>
    <PublicViewTracker/>
    <header className="public-menu-header"><a href="#public-menu-browser" className="public-menu-brand">{branding.logoDataUrl ? <Image src={branding.logoDataUrl} alt={`Logo ${branding.organizationName}`} width={40} height={40} unoptimized/> : <span>{branding.shortName}</span>}<strong>{branding.organizationName}</strong></a><Dialog><DialogTrigger asChild><button type="button" className="staff-login-trigger"><LogIn aria-hidden="true"/>Đăng nhập nhân viên</button></DialogTrigger><DialogContent className="max-h-[92vh] max-w-md overflow-y-auto"><DialogHeader><DialogTitle>Đăng nhập nhân viên</DialogTitle><DialogDescription>Dùng tài khoản do bệnh viện cấp để vào khu vực làm việc.</DialogDescription></DialogHeader><LoginForm/></DialogContent></Dialog></header>

    <section className={branding.publicHeroEnabled ? "public-menu-hero public-menu-hero-compact has-public-hero" : "public-menu-hero public-menu-hero-compact"} style={heroStyle} id="public-menu-browser" aria-labelledby="public-menu-title"><div className="public-menu-copy"><p className="eyebrow">Thực đơn dành cho người bệnh</p><h1 id="public-menu-title">Xem thực đơn theo chế độ ăn</h1><p>Chọn mã chế độ ăn và ngày. Hệ thống chỉ hiển thị thực đơn đã lưu và tự khóa theo giờ.</p></div><form method="get" className="public-menu-filter"><label>Mã chế độ ăn<select name="diet" defaultValue={menu.selectedDiet?.code ?? ""}>{menu.diets.map((diet) => <option key={diet.id} value={diet.code}>{diet.code} · {diet.name}{diet.feedingRoute === "SONDE" ? " · Qua sonde" : ""}</option>)}</select></label><label>Ngày xem<input type="date" name="date" min={menu.minDate} max={menu.maxDate} defaultValue={menu.selectedDate}/></label><button type="submit">Xem thực đơn</button><small>Xem trước tối đa {menu.advanceEntryDays} ngày theo cấu hình bệnh viện.</small></form></section>

    <section className="public-meal-timeline" aria-label="Suất ăn hiện tại và suất kế tiếp">
      <article><Clock3 aria-hidden="true"/><div><span>Suất hiện tại</span>{menu.currentMeal ? <><strong>{menu.currentMeal.mealType.name} · {menu.currentMeal.mealType.serviceTime}</strong><small>{menu.currentMeal.dishes.length ? menu.currentMeal.dishes.join(" · ") : "— · Chưa có tên món"}</small></> : <><strong>—</strong><small>Chưa đến suất đầu tiên trong ngày.</small></>}</div></article>
      <article className="is-next"><Clock3 aria-hidden="true"/><div><span>Suất kế tiếp</span>{menu.nextMeal ? <><strong>{menu.nextMeal.mealType.name} · {menu.nextMeal.mealType.serviceTime}</strong><small>{dateLabel.format(menu.nextMeal.mealDate)} · {menu.nextMeal.dishes.length ? menu.nextMeal.dishes.join(" · ") : "Chưa có tên món"}</small></> : <><strong>—</strong><small>Chưa có thực đơn kế tiếp trong cửa sổ công khai.</small></>}</div></article>
    </section>

    <section className="public-menu-results" aria-labelledby="public-menu-result-title"><header><div><p className="eyebrow">Thực đơn đã lưu</p><h2 id="public-menu-result-title">{menu.selectedDiet ? `${menu.selectedDiet.code} · ${menu.selectedDiet.name}` : "Chưa có mã chế độ ăn"}</h2></div><time dateTime={menu.selectedDate}>{dateLabel.format(new Date(`${menu.selectedDate}T00:00:00.000Z`))}</time></header>{!menu.meals.length ? <div className="public-menu-empty"><Utensils aria-hidden="true"/><strong>Chưa có thực đơn cho lựa chọn này</strong><span>Vui lòng chọn ngày khác hoặc liên hệ khoa điều trị.</span></div> : <div className="public-menu-meal-list">{menu.meals.map((meal) => <article key={meal.id}>{menu.showImages ? meal.evidence[0]?.publicUrl ? <img src={meal.evidence[0].publicUrl} alt={`Ảnh ${meal.mealType.name} · ${menu.selectedDiet?.name ?? "chế độ ăn"}`}/> : <div className="public-menu-photo-empty"><ImageOff aria-hidden="true"/><span>Chưa có ảnh</span></div> : null}<div><span>{meal.mealType.serviceTime}</span><h3>{meal.mealType.name}</h3>{meal.dishes.length ? <div className="public-dish-list">{meal.dishes.map((dish) => <section key={dish}><h4>{dish}</h4><ul>{meal.ingredients.filter((item) => item.dishName === dish).map((item, index) => <li key={`${item.name}-${index}`}><span>{item.name}</span><strong>{item.grams === null ? "—" : `${numberFormat.format(item.grams)} g`}</strong></li>)}</ul></section>)}</div> : <small>Chưa có dữ liệu món ăn.</small>}{meal.patientVisibleNote ? <aside className="public-patient-note"><strong>Ghi chú từ dinh dưỡng</strong><p>{meal.patientVisibleNote}</p></aside> : null}</div></article>)}</div>}</section>
    <section className="public-patient-feedback" id="gui-ghi-chu" aria-labelledby="public-note-title"><div className="public-patient-feedback-copy"><MessageSquareText aria-hidden="true"/><div><p className="eyebrow">Gửi tới khoa điều trị</p><h2 id="public-note-title">Ghi chú cho suất ăn tiếp theo</h2><p>Chọn tên khoa để điều dưỡng tiếp nhận. Ghi chú chỉ chuyển tới bếp sau khi được khoa kiểm tra; không nhập thông tin bệnh án.</p></div></div>
      {query.note === "sent" ? <p className="patient-form-success" role="status">Đã gửi ghi chú. Điều dưỡng của khoa sẽ kiểm tra trước khi chuyển tới bếp.</p> : null}
      {query.note && query.note !== "sent" ? <p className="patient-form-error" role="alert">{query.note === "limited" ? "Bạn đã gửi quá nhiều ghi chú. Vui lòng thử lại sau." : query.note === "invalid" ? "Ghi chú cần từ 3 đến 500 ký tự." : "Chưa thể gửi ghi chú lúc này. Vui lòng thử lại sau."}</p> : null}
      {menu.departments.length ? <form action={submitPublicPatientNoteAction}><input type="hidden" name="returnDiet" value={menu.selectedDiet?.code ?? ""}/><input type="hidden" name="returnDate" value={menu.selectedDate}/><label>Khoa điều trị<select name="departmentToken" required defaultValue=""><option value="" disabled>Chọn tên khoa</option>{menu.departments.map((department) => <option key={department.id} value={department.token}>{department.name}</option>)}</select></label><label>Ghi chú <span>bắt buộc</span><textarea name="note" minLength={3} maxLength={500} required placeholder="Ví dụ: Xin lưu ý món ăn cần mềm hơn…"/></label><label>Tên để khoa tiện trao đổi <span>không bắt buộc</span><input name="contactName" maxLength={100} autoComplete="off"/></label><button type="submit">Gửi ghi chú</button></form> : <p className="public-note-unavailable">— · Bệnh viện chưa mở khoa nhận ghi chú công khai.</p>}
    </section>
    <footer className="public-menu-footer"><span>Thông tin thực đơn chung · Không thay thế chỉ định điều trị</span>{menu.showViewCount ? <span>{new Intl.NumberFormat("vi-VN").format(views.total)} lượt xem</span> : null}</footer>
  </main>;
}
