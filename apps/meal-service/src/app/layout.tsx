import "@fontsource/noto-sans/400.css";
import "@fontsource/noto-sans/500.css";
import "@fontsource/noto-sans/600.css";
import "@fontsource/noto-sans/700.css";
import "./globals.css";
import type { CSSProperties } from "react";
import { BrandingProvider } from "@/components/branding-context";
import { blendHex, readBrandingSettings, readableForeground } from "@/lib/branding";

export async function generateMetadata() {
  const branding = await readBrandingSettings();
  return { title: branding.organizationName, description: `Nền tảng quản lý suất ăn · ${branding.organizationName}` };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const branding = await readBrandingSettings();
  const foreground = readableForeground(branding.primaryColor);
  const primary = foreground === "#17241F" ? blendHex(branding.primaryColor, "#000000", .58) : branding.primaryColor;
  const accent = blendHex(primary, readableForeground(primary) === "#FFFFFF" ? "#FFFFFF" : "#000000", .18);
  const theme = { "--brand-surface": branding.primaryColor, "--brand-foreground": foreground, "--primary": primary, "--primary-foreground": readableForeground(primary), "--sidebar": primary, "--secondary": blendHex(branding.primaryColor, "#FFFFFF", .72), "--secondary-foreground": primary, "--accent": accent, "--accent-foreground": readableForeground(accent), "--ring": accent } as CSSProperties;
  return <html lang="vi"><body style={theme}><BrandingProvider value={branding}>{children}</BrandingProvider></body></html>;
}
