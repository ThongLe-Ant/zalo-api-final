import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ['sharp', 'zalo-api-final'],
  // Turbopack config (Next.js 16 uses Turbopack by default)
  turbopack: {
    // Empty config to silence the warning
  },
};

export default nextConfig;
