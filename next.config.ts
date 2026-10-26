import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/*": ["./posts/**/*"],
  },
};

export default nextConfig;
