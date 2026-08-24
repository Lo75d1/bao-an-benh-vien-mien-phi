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
  const accent = blendHex(branding.primaryColor, foreground === "#FFFFFF" ? "#FFFFFF" : "#000000", .18);
  const theme = { "--primary": branding.primaryColor, "--primary-foreground": foreground, "--sidebar": branding.primaryColor, "--secondary": blendHex(branding.primaryColor, "#FFFFFF", .9), "--secondary-foreground": branding.primaryColor, "--accent": accent, "--accent-foreground": readableForeground(accent), "--ring": accent } as CSSProperties;
  return <html lang="vi"><body style={theme}><BrandingProvider value={branding}>{children}</BrandingProvider></body></html>;
}
