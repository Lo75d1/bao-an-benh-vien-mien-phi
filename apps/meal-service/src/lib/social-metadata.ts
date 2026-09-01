import type { Metadata } from "next";
import { headers } from "next/headers";
import type { Locale } from "./locale";
import { readLocale } from "./locale-server";

export const SOCIAL_PREVIEW_DESCRIPTION =
  "Hệ thống quản lý báo suất, thực đơn, bếp, kho và theo dõi suất ăn dành cho bệnh viện. Phiên bản main published được tùy chỉnh theo từng bệnh viện triển khai.";

const SOCIAL_PREVIEW_DESCRIPTION_EN =
  "Hospital meal-service management system for meal reporting, menus, kitchen operations, warehouse management, and meal tracking. The published MAIN version can be customized for each hospital deployment.";

const DEFAULT_SOCIAL_IMAGE_PATH = "/branding/social-preview.png";

async function requestOrigin(): Promise<URL> {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const proto = headerStore.get("x-forwarded-proto") ?? "https";
  return new URL(host ? `${proto}://${host}` : "http://localhost:3000");
}

function absoluteUrl(base: URL, path: string): string {
  return new URL(path, base).toString();
}

export function composeSocialMetadata(metadataBase: URL, locale: Locale, canonicalPath = "/"): Metadata {
  const title = "Suất ăn bệnh viện – Demo";
  const description = locale === "en" ? SOCIAL_PREVIEW_DESCRIPTION_EN : SOCIAL_PREVIEW_DESCRIPTION;
  const image = absoluteUrl(metadataBase, DEFAULT_SOCIAL_IMAGE_PATH);
  const canonical = absoluteUrl(metadataBase, canonicalPath);

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

export async function buildSocialMetadata(canonicalPath = "/"): Promise<Metadata> {
  const [locale, metadataBase] = await Promise.all([readLocale(), requestOrigin()]);
  return composeSocialMetadata(metadataBase, locale, canonicalPath);
}
