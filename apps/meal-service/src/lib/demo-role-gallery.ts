import type { DemoEntryAccount } from "@/components/demo-entry";
import type { getTranslations } from "./locale";

export const DEMO_ROLE_GALLERY_ORDER = ["patient", "nurse", "dietitian", "kitchen", "admin"] as const;

export const DEMO_ROLE_GALLERY_IMAGES = {
  patient: "/demo/role-guides/patient.jpg",
  nurse: "/demo/role-guides/nurse.jpg",
  dietitian: "/demo/role-guides/dietitian.jpg",
  kitchen: "/demo/role-guides/kitchen.jpg",
  admin: "/demo/role-guides/admin.jpg",
} as const;

export type DemoRoleGalleryKey = (typeof DEMO_ROLE_GALLERY_ORDER)[number];

export function demoRoleGalleryItems(t: ReturnType<typeof getTranslations>["public"]["roleGallery"], entries: DemoEntryAccount[]) {
  return DEMO_ROLE_GALLERY_ORDER.map((role) => ({
    role,
    image: DEMO_ROLE_GALLERY_IMAGES[role],
    title: t.roles[role].title,
    description: t.roles[role].description,
    alt: t.roles[role].alt,
    entry: entries.find((item) => item.key === role) ?? null,
  }));
}
