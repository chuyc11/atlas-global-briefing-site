import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    // The Vinext Worker injects a per-request nonce CSP. Keep only static
    // headers here so a fixed policy cannot weaken or break that runtime CSP.
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
