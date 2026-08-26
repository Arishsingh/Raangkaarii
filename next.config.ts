import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: {
    // The floating action stack now lives bottom-right.
    position: "bottom-left",
  },
};

export default nextConfig;
