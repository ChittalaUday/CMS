import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const r2PublicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL
  ? new URL(process.env.CLOUDFLARE_R2_PUBLIC_URL)
  : null;

const nextConfig: NextConfig = {
  /* config options here
  reactCompiler: true,*/
  allowedDevOrigins: ["*"],
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  images: {
    remotePatterns: r2PublicUrl
      ? [{ protocol: r2PublicUrl.protocol.replace(":", "") as "http" | "https", hostname: r2PublicUrl.hostname }]
      : [],
  },
};

export default withBundleAnalyzer(nextConfig);
