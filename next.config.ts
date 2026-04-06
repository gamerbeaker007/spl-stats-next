import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  cacheComponents: true,

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
    ],
  },
};

export default nextConfig;
