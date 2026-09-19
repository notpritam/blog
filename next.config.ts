import type { NextConfig } from 'next';

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const nextConfig: NextConfig = {
  // `next dev` and `next build` would otherwise share .next and corrupt each other
  // when the dev server runs while production is rebuilt.
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
  // Next 15 streams generateMetadata output into <body> for most user agents and only
  // blocks (renders it in <head>) for a bot shortlist. A blog lives on its <head>
  // metadata, so treat every agent as such: title, description, canonical, OG and
  // Twitter tags are always in the initial <head>.
  htmlLimitedBots: /.*/,
  serverExternalPackages: ['better-sqlite3', 'shiki', '@shikijs/rehype'],
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [390, 640, 768, 1024, 1280, 1440, 1920],
    imageSizes: [28, 36, 64, 128, 256, 465, 715],
  },
  async rewrites() {
    return [
      { source: '/:slug.md', destination: '/md/:slug' },
      // IndexNow key file: https://blog.notpritam.in/<32-hex-key>.txt
      { source: '/:key([a-f0-9]{32}).txt', destination: '/indexnow/:key' },
    ];
  },
  async headers() {
    return [
      {
        source: '/:prefix(admin|api|preview)/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
