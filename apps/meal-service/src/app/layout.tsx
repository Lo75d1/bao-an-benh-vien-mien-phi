import "@fontsource/be-vietnam-pro/400.css";
import "@fontsource/be-vietnam-pro/500.css";
import "@fontsource/be-vietnam-pro/600.css";
import "@fontsource/be-vietnam-pro/700.css";
import "./globals.css";
import type { CSSProperties } from "react";
import { BrandingProvider } from "@/components/branding-context";
import { blendHex, readBrandingSettings, readableForeground } from "@/lib/branding";
import { buildSocialMetadata } from "@/lib/social-metadata";

export async function generateMetadata() {
  return buildSocialMetadata();
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const branding = await readBrandingSettings();
  const foreground = readableForeground(branding.primaryColor);
  // Nền nhận diện sáng vẫn cần một màu chức năng đủ rõ; pha màu pastel với đen
  // tạo ra xám/nâu bẩn ở trạng thái đang chọn.
  const primary = foreground === "#17241F" ? "#0F6E56" : branding.primaryColor;
  const accent = blendHex(primary, readableForeground(primary) === "#FFFFFF" ? "#FFFFFF" : "#000000", .18);
  const theme = { "--brand-surface": branding.primaryColor, "--brand-foreground": foreground, "--primary": primary, "--primary-foreground": readableForeground(primary), "--sidebar": primary, "--secondary": blendHex(branding.primaryColor, "#FFFFFF", .72), "--secondary-foreground": primary, "--accent": accent, "--accent-foreground": readableForeground(accent), "--ring": accent } as CSSProperties;
  return <html lang="vi"><body style={theme}><BrandingProvider value={branding}>{children}</BrandingProvider></body></html>;
}
