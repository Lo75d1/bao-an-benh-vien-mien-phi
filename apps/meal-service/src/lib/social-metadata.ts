import type { Metadata } from "next";
import { headers } from "next/headers";
import { readBrandingSettings, type BrandingSettings } from "./branding";
import { readOperationalSettings } from "./settings";

export const SOCIAL_PREVIEW_DESCRIPTION =
  "Hệ thống quản lý báo suất, thực đơn, bếp, kho và theo dõi suất ăn dành cho bệnh viện. Phiên bản main published được tùy chỉnh theo từng bệnh viện triển khai.";

const DEFAULT_SOCIAL_IMAGE_PATH = "/branding/social-preview.png";

function configuredOrigin(publicBaseUrl: string): URL | null {
  if (!publicBaseUrl) return null;
  try {
    return new URL(publicBaseUrl);
  } catch {
    return null;
  }
}

async function requestOrigin(): Promise<URL> {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const proto = headerStore.get("x-forwarded-proto") ?? "https";
  return new URL(host ? `${proto}://${host}` : "http://localhost:3000");
}

function titleFor(branding: BrandingSettings): string {
  const name = branding.organizationName.trim();
  return name && name !== "Suất ăn bệnh viện" ? `Suất ăn bệnh viện – ${name}` : "Suất ăn bệnh viện";
}

function absoluteUrl(base: URL, path: string): string {
  return new URL(path, base).toString();
}

export async function buildSocialMetadata(): Promise<Metadata> {
  const settingsPromise = process.env.DATABASE_URL
    ? readOperationalSettings().catch(() => ({ publicBaseUrl: "" }))
    : Promise.resolve({ publicBaseUrl: "" });
  const [branding, settings, fallbackOrigin] = await Promise.all([
    readBrandingSettings(),
    settingsPromise,
    requestOrigin(),
  ]);
  const metadataBase = configuredOrigin(settings.publicBaseUrl) ?? fallbackOrigin;
  const title = titleFor(branding);
  const description = SOCIAL_PREVIEW_DESCRIPTION;
  const image = absoluteUrl(metadataBase, DEFAULT_SOCIAL_IMAGE_PATH);
  const canonical = absoluteUrl(metadataBase, "/");

  return {
    metadataBase,
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      title,
      description,
      url: canonical,
      siteName: title,
      images: [{ url: image, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}
