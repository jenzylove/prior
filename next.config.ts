import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  serverExternalPackages: ["@mysten-incubation/memwal", "@mysten/seal", "@mysten/walrus", "@suimpp/mpp", "mppx"],
};

export default nextConfig;
