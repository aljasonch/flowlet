import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Reuse recently visited pages from the client cache. Server Actions that
    // call revalidatePath purge it, so data stays fresh after mutations.
    staleTimes: { dynamic: 30, static: 180 },
  },
};

export default nextConfig;
