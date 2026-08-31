import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Suất ăn bệnh viện",
    short_name: "Suất ăn BV",
    description: "Hệ thống quản lý suất ăn bệnh viện",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f8fbfd",
    theme_color: "#123c36",
    icons: [
      { src: "/pwa-icon.svg", sizes: "192x192", type: "image/svg+xml", purpose: "any" },
      { src: "/pwa-icon.svg", sizes: "512x512", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
