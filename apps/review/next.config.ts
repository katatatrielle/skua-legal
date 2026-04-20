import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@skua/sdk", "@skua/schemas"]
};

export default nextConfig;
