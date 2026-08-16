import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// Host of our own Supabase project, for the image allow-list below. Derived
// rather than written out, so it cannot drift from the URL the app actually
// talks to. Empty when the env var is missing — the allow-list then matches
// nothing, which fails closed (no images) instead of open (any host).
const supabaseHost = supabaseUrl ? new URL(supabaseUrl).hostname : "";

const nextConfig: NextConfig = {
  // Pin the Turbopack workspace root to this project directory so Next 16
  // resolves tailwindcss from the correct location.
  turbopack: {
    root: __dirname,
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey,
  },
  allowedDevOrigins: ["localhost", "127.0.0.1"],
  images: {
    // Sprites are versioned by filename, so the optimizer can hold its WebP
    // derivatives for a week instead of re-validating on every visit. Matches
    // the Cache-Control we set for /sprites/* in netlify.toml.
    minimumCacheTTL: 604800,
    // Project-showcase pictures, and nothing else. Both halves are load-bearing:
    // a `*.supabase.co` wildcard would make /_next/image an open proxy for any
    // Supabase project on earth, and a `/object/public/**` path would proxy every
    // other public bucket in our own. The database pins the same URL from the
    // other side — see supabase/migrations/0024_project_image_host_pin.sql.
    remotePatterns: supabaseHost
      ? [
          {
            protocol: "https",
            hostname: supabaseHost,
            pathname: "/storage/v1/object/public/project-images/**",
          },
        ]
      : [],
  },
  // Baseline security headers.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), browsing-topics=()",
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
