/* eslint-disable @next/next/no-img-element -- public evidence URL comes from configured storage */
import Image from "next/image";
import type { CSSProperties } from "react";
import { CalendarDays, ImageOff, LogIn, Utensils } from "lucide-react";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getSessionUser } from "@/lib/auth";
import { blendHex, readBrandingSettings, readableForeground } from "@/lib/branding";
import { readPublicDietMenu } from "@/lib/patient-note";
import { readPublicViewStats } from "@/lib/public-page-views";
import { PublicViewTracker } from "@/components/public-view-tracker";

const dateLabel = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
const numberFormat = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });

export default async function HomePage({ searchParams }: { searchParams: Promise<{ diet?: string; date?: string; patient?: string }> }) {
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

    <section className="public-menu-results" aria-labelledby="public-menu-result-title"><header><div><p className="eyebrow">Thực đơn đã lưu</p><h2 id="public-menu-result-title">{menu.selectedDiet ? `${menu.selectedDiet.code} · ${menu.selectedDiet.name}` : "Chưa có mã chế độ ăn"}</h2></div><time dateTime={menu.selectedDate}>{dateLabel.format(new Date(`${menu.selectedDate}T00:00:00.000Z`))}</time></header>{!menu.meals.length ? <div className="public-menu-empty"><Utensils aria-hidden="true"/><strong>Chưa có thực đơn cho lựa chọn này</strong><span>Vui lòng chọn ngày khác hoặc liên hệ khoa điều trị.</span></div> : <div className="public-menu-meal-list">{menu.meals.map((meal) => <article key={meal.id}>{menu.showImages ? meal.evidence[0]?.publicUrl ? <img src={meal.evidence[0].publicUrl} alt={`Ảnh ${meal.mealType.name} · ${menu.selectedDiet?.name ?? "chế độ ăn"}`}/> : <div className="public-menu-photo-empty"><ImageOff aria-hidden="true"/><span>Chưa có ảnh</span></div> : null}<div><span>{meal.mealType.serviceTime}</span><h3>{meal.mealType.name}</h3>{meal.dishes.length ? <div className="public-dish-list">{meal.dishes.map((dish) => <section key={dish}><h4>{dish}</h4><ul>{meal.ingredients.filter((item) => item.dishName === dish).map((item, index) => <li key={`${item.name}-${index}`}><span>{item.name}</span><strong>{item.grams === null ? "—" : `${numberFormat.format(item.grams)} g`}</strong></li>)}</ul></section>)}</div> : <small>Chưa có dữ liệu món ăn.</small>}</div></article>)}</div>}</section>

    <section className="public-menu-help" aria-label="Thông tin thực đơn"><article><CalendarDays aria-hidden="true"/><div><strong>Ngày xem do bệnh viện kiểm soát</strong><span>Không thể chọn vượt quá khoảng ngày đã cấu hình.</span></div></article><article><Utensils aria-hidden="true"/><div><strong>Đúng mã chế độ ăn</strong><span>Thực đơn được tách rõ ăn đường miệng và qua sonde.</span></div></article><article><ImageOff aria-hidden="true"/><div><strong>Ảnh là tùy chọn</strong><span>Quản trị quyết định có công khai ảnh món ăn hay không.</span></div></article></section>
    <footer className="public-menu-footer"><span>Thông tin thực đơn chung · Không thay thế chỉ định điều trị</span>{menu.showViewCount ? <span>{new Intl.NumberFormat("vi-VN").format(views.total)} lượt xem</span> : null}</footer>
  </main>;
}
