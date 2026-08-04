import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Bilinen görsel kaynaklarıyla sınırlı (SSRF/kötüye kullanım yüzeyini daraltır).
    remotePatterns: [
      { protocol: "https", hostname: "sonbirsozcom.teimg.com" },
      { protocol: "https", hostname: "*.teimg.com" },
      { protocol: "https", hostname: "www.sonbirsoz.com" },
      { protocol: "https", hostname: "sonbirsoz.com" },
      // Kendi görsel bucket'ımız (eski CDN'den taşınan 24K+ haber görseli)
      { protocol: "https", hostname: "sonbirsoz-img-060768936870.s3.eu-central-1.amazonaws.com" },
      { protocol: "https", hostname: "sonbirsoz-media-060768936870.s3.eu-central-1.amazonaws.com" },
      { protocol: "https", hostname: "cdn.aiartists.studio" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "img.youtube.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
      // Yaygın Türk haber ajansı/kaynak görsel host'ları (RSS içe aktarma için).
      { protocol: "https", hostname: "*.ntv.com.tr" },
      { protocol: "https", hostname: "*.hurimg.com" },
      { protocol: "https", hostname: "*.cumhuriyet.com.tr" },
      { protocol: "https", hostname: "*.sabah.com.tr" },
      { protocol: "https", hostname: "*.milliyet.com.tr" },
      { protocol: "https", hostname: "*.aa.com.tr" },
      { protocol: "https", hostname: "*.iha.com.tr" },
      { protocol: "https", hostname: "*.dha.com.tr" },
      { protocol: "https", hostname: "*.trthaber.com" },
      { protocol: "https", hostname: "*.cloudfront.net" },
      { protocol: "https", hostname: "*.amazonaws.com" },
    ],
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns", "framer-motion"],
  },
  // Video altyazı fontu Lambda paketine dahil edilsin (ffmpeg binary'si
  // boyut limiti nedeniyle S3'ten /tmp'ye runtime'da indirilir)
  outputFileTracingIncludes: {
    "/api/admin/video": ["./assets/fonts/**"],
    "/api/cron/social-post": ["./assets/fonts/**"],
  },
  async headers() {
    const csp = [
      "default-src 'self'",
      // GA + Next inline script'leri (JSON-LD, sw kaydı) için unsafe-inline gerekli
      "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com",
      "style-src 'self' 'unsafe-inline'",
      // Haber içeriği görselleri farklı CDN'lerden gelebilir
      "img-src 'self' https: data: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://www.google-analytics.com https://analytics.google.com https://region1.google-analytics.com https://www.googletagmanager.com",
      "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
      "media-src 'self' https:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
      "upgrade-insecure-requests",
    ].join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "origin-when-cross-origin" },
          { key: "X-Robots-Tag", value: "max-image-preview:large" },
          { key: "Content-Security-Policy", value: csp },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
          },
        ],
      },
      // Taze veri gerektiren API'ler: asla cache'lenmesin
      {
        source: "/api/cron/:path*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
      {
        source: "/api/admin/:path*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
      {
        source: "/api/auth/:path*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
      {
        source: "/api/newsletter",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
      {
        source: "/api/push/:path*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
      // İkonlar/statik marka varlıkları: uzun cache (hash'siz olduğundan 1 gün + SWR)
      {
        source: "/icons/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
        ],
      },
      {
        source: "/:file(favicon.ico|favicon-16.png|favicon-32.png|favicon-48.png|apple-touch-icon.png|og-default.png)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
        ],
      },
      // Service worker her zaman taze olmalı (sürüm geçişleri için)
      {
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "no-cache, max-age=0" }],
      },
    ];
  },
  async redirects() {
    return [
      // Eski sonbirsoz.com sitemap yapısı (Search Console'da kayıtlı) → yeni yollar
      {
        source: "/sitemap-news.xml",
        destination: "/news-sitemap.xml",
        permanent: true,
      },
      {
        source: "/sitemap/:path*",
        destination: "/sitemap.xml",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/llms.txt",
        destination: "/api/llms-txt",
      },
    ];
  },
};

export default nextConfig;
