import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  cacheComponents: true,

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
    ],
  },
};

export default nextConfig;
