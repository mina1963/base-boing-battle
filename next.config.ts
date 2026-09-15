import type { NextConfig } from "next";
import { validateTestServer } from "./lib/test-server.cjs";

validateTestServer(process.env.NEXT_PUBLIC_TEST_SOCKET_URL,
  process.env.VERCEL_GIT_COMMIT_REF === "codex/network-staging");

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.106"],

  output: "export",

  images: {
    unoptimized: true,
  },
};

export default nextConfig;
