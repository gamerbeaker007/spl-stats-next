import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
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
    ],
  },
};

export default nextConfig;
