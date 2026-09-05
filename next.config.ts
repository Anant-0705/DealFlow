import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    authInterrupts: true,
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
