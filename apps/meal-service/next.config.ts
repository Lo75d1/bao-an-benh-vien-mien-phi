import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@suat-an/nutrition-engine"],
  experimental: {
    // A kitchen completion form can carry one photo per active diet code.
    // Per-file validation remains capped at 10 MB in the server action.
    serverActions: { bodySizeLimit: "48mb" },
  },
};
export default nextConfig;
