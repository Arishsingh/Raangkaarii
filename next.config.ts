import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Product stills uploaded through the admin panel.
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
      // Clerk avatars, shown in the admin panel's member list.
      { protocol: "https", hostname: "img.clerk.com" },
    ],
  },
  devIndicators: {
    // The floating action stack now lives bottom-right.
    position: "bottom-left",
  },
};

export default nextConfig;
