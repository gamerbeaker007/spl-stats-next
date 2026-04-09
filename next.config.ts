import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // 'unsafe-inline' required: FOUC inline script + MUI emotion inline styles
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://images.hive.blog https://d36mxiodymuqjm.cloudfront.net https://peakmonsters.com https://next.splinterlands.com https://files.peakd.com",
      "connect-src 'self' https://api.hive.blog https://api.deathwing.me https://api.openhive.network",
      "font-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  cacheComponents: true,

  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },

  experimental: {
    serverActions: {
      bodySizeLimit: "200mb",
    },
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.hive.blog",
        pathname: "/u/**",
      },
      {
        protocol: "https",
        hostname: "d36mxiodymuqjm.cloudfront.net",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "peakmonsters.com",
        pathname: "/app/img/**",
      },
      {
        protocol: "https",
        hostname: "next.splinterlands.com",
        pathname: "/assets/cards/**",
      },
      {
        protocol: "https",
        hostname: "files.peakd.com",
        pathname: "/file/peakd-hive/**",
      },
    ],
  },
};

export default nextConfig;
