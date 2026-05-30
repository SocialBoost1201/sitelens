// Next.js 16 configuration — SiteLens
import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Fix the workspace root warning from Turbopack detecting multiple lockfiles
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
