import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root — a stray lockfile in the home dir otherwise makes
  // Turbopack infer the wrong root and emit a warning.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
