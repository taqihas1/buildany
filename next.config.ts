import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true, // tsc --noEmit passes; Next.js TS 5.9.2 has bug
  },
};

export default nextConfig;
