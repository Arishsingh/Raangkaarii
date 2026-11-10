import type { NextConfig } from "next";

/**
 * A day fresh, then a week where a stale copy is served while a fresh one is
 * fetched behind it. Deliberately not `immutable`: these files are served under
 * fixed names, so replacing one has to be able to reach people already holding
 * it. The optimiser's own output is content-addressed and cached separately.
 */
const CACHE_STATIC_MEDIA = {
  key: "Cache-Control",
  value: "public, max-age=86400, stale-while-revalidate=604800",
};

const nextConfig: NextConfig = {
  images: {
    /**
     * Serve photos as stored instead of through Vercel's image optimiser. On
     * the Hobby plan its monthly allowance ran out and every optimised request
     * came back 402 OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED, leaving the
     * storefront with blank cards. /api/media already sends a year-long
     * immutable cache header, so the CDN still serves each file once fetched.
     */
    unoptimized: true,
    remotePatterns: [
      // Product stills uploaded through the admin panel.
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
      // Clerk avatars, shown in the admin panel's member list.
      { protocol: "https", hostname: "img.clerk.com" },
    ],
    /**
     * How long an optimised image is kept before the source is fetched and
     * re-encoded. Thirty days is safe here because every uploaded file gets a
     * random suffix — replacing a product photo produces a new URL rather than
     * new bytes behind the old one, so a long life can never serve a stale one.
     */
    minimumCacheTTL: 2_592_000,
  },

  async headers() {
    return [
      {
        // Anchored to a single root-level segment on purpose: a looser .webp
        // rule also matches /_next/static/**, whose hashed filenames are meant
        // to be cached immutably and must not be pulled down to a day.
        source: "/:file(hero[^/]*\\.webp)",
        headers: [CACHE_STATIC_MEDIA],
      },
      {
        source: "/videos/:path*",
        headers: [CACHE_STATIC_MEDIA],
      },
    ];
  },
  experimental: {
    /**
     * With a proxy in place Next buffers request bodies to allow a second read,
     * and quietly truncates anything past this — see the note in src/proxy.ts.
     * Sized just above the largest upload the admin panel accepts.
     */
    proxyClientMaxBodySize: "26mb",
  },

  devIndicators: {
    // The floating action stack now lives bottom-right.
    position: "bottom-left",
  },
};

export default nextConfig;
