import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.106"],

  output: "export",

  images: {
    unoptimized: true,
  },
};

export default nextConfig;