import "@fontsource/be-vietnam-pro/400.css";
import "@fontsource/be-vietnam-pro/500.css";
import "@fontsource/be-vietnam-pro/600.css";
import "@fontsource/be-vietnam-pro/700.css";
import "./globals.css";
import type { CSSProperties } from "react";
import { BrandingProvider } from "@/components/branding-context";
import { blendHex, readBrandingSettings, readableForeground } from "@/lib/branding";
import { readRequestClock } from "@/lib/request-clock";
import { DemoClockProvider } from "@/components/demo-clock-context";

export async function generateMetadata() {
  const branding = await readBrandingSettings();
  return { title: branding.organizationName || "Suất ăn bệnh viện", description: `Nền tảng quản lý suất ăn · ${branding.organizationName || "Suất ăn bệnh viện"}`, applicationName: "Suất ăn bệnh viện", manifest: "/manifest.webmanifest", appleWebApp: { capable: true, title: "Suất ăn bệnh viện" } };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [branding, clock] = await Promise.all([readBrandingSettings(), readRequestClock()]);
  const foreground = readableForeground(branding.primaryColor);
  // Nền nhận diện sáng vẫn cần một màu chức năng đủ rõ; pha màu pastel với đen
  // tạo ra xám/nâu bẩn ở trạng thái đang chọn.
  const primary = foreground === "#17241F" ? "#0F6E56" : branding.primaryColor;
  const accent = blendHex(primary, readableForeground(primary) === "#FFFFFF" ? "#FFFFFF" : "#000000", .18);
  const theme = { "--brand-surface": branding.primaryColor, "--brand-foreground": foreground, "--primary": primary, "--primary-foreground": readableForeground(primary), "--sidebar": primary, "--secondary": blendHex(branding.primaryColor, "#FFFFFF", .72), "--secondary-foreground": primary, "--accent": accent, "--accent-foreground": readableForeground(accent), "--ring": accent } as CSSProperties;
  return <html lang="vi"><body style={theme}><BrandingProvider value={branding}><DemoClockProvider value={clock.enabled ? { nowIso: clock.now.toISOString(), simulated: clock.simulated } : null}>{children}</DemoClockProvider></BrandingProvider></body></html>;
}
