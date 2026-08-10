import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { isAuthBypassEnabled } from "@/lib/auth-guard";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { CATEGORIES } from "@/lib/utils/constants";

const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN", "EDITOR", "AUTHOR"];

/**
 * Güvenlik header'larını response'a ekler
 */
function addSecurityHeaders(response: NextResponse): NextResponse {
  // XSS koruması
  response.headers.set("X-XSS-Protection", "1; mode=block");
  
  // Clickjacking koruması
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  
  // MIME type sniffing koruması
  response.headers.set("X-Content-Type-Options", "nosniff");
  
  // Referrer policy
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  
  // Permissions policy
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  );
  
  // HSTS (production'da aktif)
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }
  
  return response;
}

/**
 * Eski sonbirsoz.com kök seviye haber URL'lerini (/haber-slug) yeni
 * /kategori/haber-slug yapısına 301 yönlendirmek için, bu tek-segment yolların
 * ATLANMASI gereken bilinen ilk-segment değerleri. Bunlar gerçek sayfalardır.
 */
const KNOWN_FIRST_SEGMENTS = new Set<string>([
  ...CATEGORIES.map((c) => c.slug),
  "servisler",
  "yazar",
  "yazarlar",
  "arama",
  "video",
  "foto-galeri",
  "son-dakika",
  "kunye",
  "iletisim",
  "gizlilik-politikasi",
  "kvkk",
  "reklam",
  "offline",
  "admin",
  "superadmin",
  "superadmin-giris",
  "api",
  "rss",
  "sitemap.xml",
  "news-sitemap.xml",
  "robots.txt",
  "manifest.webmanifest",
  "llms.txt",
  "llms-full.txt",
  "favicon.ico",
]);

/**
 * Eski sonbirsoz.com bölüm/landing URL'leri → yeni karşılıkları (301).
 * Makale lookup'ından ÖNCE kontrol edilir — böylece ör. /kultur-amp-sanat
 * yanlışlıkla makale sanılıp /kultur/kultur-amp-sanat'a yönlenmez.
 */
const LEGACY_SECTION_REDIRECTS: Record<string, string> = {
  "/turkiye": "/gundem",
  "/genel": "/gundem",
  "/roportaj": "/gundem",
  "/kultur-amp-sanat": "/kultur",
  "/kultur-sanat": "/kultur",
  "/finans": "/ekonomi",
  "/borsa": "/servisler/doviz",
  "/rss": "/rss.xml",
  "/video-galeri": "/video",
  "/hakkimizda": "/kunye",
};

/**
 * Eski kök seviye haber URL'i olabilecek tek-segment yolları yakalar; lookup
 * API'sinden makalenin kategorisini alıp /kategori/slug'a 301 yönlendirir.
 * Stream başlamadan (proxy katmanında) çalıştığı için gerçek 301 döner.
 */
async function handleLegacyArticleUrl(
  request: NextRequest
): Promise<NextResponse | null> {
  if (request.method !== "GET") return null;
  const { pathname } = request.nextUrl;

  // Yalnızca /tek-segment (alt yol veya nokta/uzantı içermeyen) yollar
  const match = /^\/([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(pathname);
  if (!match) return null;
  const slug = match[1];
  if (KNOWN_FIRST_SEGMENTS.has(slug)) return null;
  // Çok kısa yollar haber/yazar olamaz (eski slug'lar tirelidir)
  if (slug.length < 8 || !slug.includes("-")) return null;

  try {
    // Amplify/CloudFront'ta middleware'den self-fetch için mutlak URL şart;
    // request.url internal host olabildiğinden gerçek host header'ını kullan.
    const host =
      request.headers.get("x-forwarded-host") ||
      request.headers.get("host") ||
      request.nextUrl.host;
    const proto =
      request.headers.get("x-forwarded-proto") || request.nextUrl.protocol.replace(":", "");
    const lookupUrl = `${proto}://${host}/api/legacy-lookup?slug=${encodeURIComponent(slug)}`;
    const res = await fetch(lookupUrl, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) return null;
    const { target } = (await res.json()) as {
      category: string | null;
      target: string | null;
    };
    if (target) {
      return NextResponse.redirect(new URL(target, request.url), 301);
    }
  } catch {
    // Lookup başarısızsa normal akışa bırak (sayfa 404/redirect fallback yapar)
  }
  return null;
}

/** Hassas API yolları için IP bazlı istek limitleri (pencere: 60 sn). */
const RATE_RULES: { prefix: string; limit: number; methods?: string[] }[] = [
  // Login brute-force koruması
  { prefix: "/api/auth/callback/credentials", limit: 10, methods: ["POST"] },
  // Form/abuse koruması
  { prefix: "/api/newsletter", limit: 5, methods: ["POST"] },
  { prefix: "/api/articles/share", limit: 30, methods: ["POST"] },
  // Arama floodu
  { prefix: "/api/search", limit: 60 },
  // AI arama (Bedrock maliyeti) — sıkı limit
  { prefix: "/api/ai-search", limit: 10 },
  // Admin API'ler için genel limit
  { prefix: "/api/admin", limit: 100 },
  // Super Admin API'ler
  { prefix: "/api/superadmin", limit: 50 },
  // Public API (v1) - plan bazlı limit ayrıca uygulanır
  { prefix: "/api/v1", limit: 200 },
  // Invite kabul
  { prefix: "/api/invite", limit: 10, methods: ["POST"] },
];

function applyRateLimit(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  for (const rule of RATE_RULES) {
    if (!pathname.startsWith(rule.prefix)) continue;
    if (rule.methods && !rule.methods.includes(request.method)) continue;

    const ip = clientIp(request.headers);
    const result = rateLimit(`${rule.prefix}:${ip}`, rule.limit, 60_000);
    if (!result.allowed) {
      return NextResponse.json(
        { error: "Çok fazla istek. Lütfen biraz bekleyin." },
        {
          status: 429,
          headers: { "Retry-After": String(result.retryAfterSeconds) },
        }
      );
    }
    break;
  }
  return null;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") || "";

  // ─── MULTI-TENANT: Subdomain/Domain'den tenant belirleme ───
  let tenantSlug: string | null = null;
  
  // Development ortamı - subdomain kontrolü (muzik.localhost:3000 gibi)
  if (host.includes("localhost") || host.includes("127.0.0.1")) {
    // muzik.localhost:3000 -> muzik
    const hostWithoutPort = host.split(":")[0]; // Port'u kaldır
    const parts = hostWithoutPort.split(".");
    
    if (parts.length >= 2 && parts[parts.length - 1] === "localhost") {
      // xxx.localhost formatı - subdomain var
      const subdomain = parts[0];
      if (subdomain !== "localhost" && subdomain !== "www") {
        tenantSlug = subdomain;
      }
    }
    
    // Subdomain yoksa default tenant
    if (!tenantSlug) {
      tenantSlug = process.env.DEV_TENANT_SLUG || "demo";
    }
  } else {
    // Production: subdomain kontrolü
    const baseDomain = process.env.BASE_DOMAIN || "sonbirsoz-saas.com";
    if (host.endsWith(baseDomain)) {
      const subdomain = host.replace(`.${baseDomain}`, "").split(".").pop();
      const platformSubdomains = ["admin", "www", "app", "api"];
      if (subdomain && !platformSubdomains.includes(subdomain)) {
        tenantSlug = subdomain;
      }
    }
  }

  // Tenant header'ı ekle (server component'larda kullanılacak)
  // NextResponse.next() ile request headers'a ekliyoruz
  const requestHeaders = new Headers(request.headers);
  if (tenantSlug) {
    requestHeaders.set("x-tenant-slug", tenantSlug);
  }
  
  // Helper: tenant header'lı response oluştur
  function createResponse(): NextResponse {
    const res = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
    addSecurityHeaders(res);
    return res;
  }

  // API rate limiting (yalnızca eşleşen hassas yollar)
  if (pathname.startsWith("/api/")) {
    const limited = applyRateLimit(request);
    if (limited) return limited;
    return createResponse();
  }

  // ─── SUPER ADMIN GİRİŞ SAYFASI ───
  // Bu sayfa public, auth gerektirmez
  if (pathname === "/superadmin-giris") {
    return createResponse();
  }

  // ─── SUPER ADMIN ROUTES ───
  if (pathname.startsWith("/superadmin")) {
    if (isAuthBypassEnabled()) {
      return createResponse();
    }

    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    const isSuperAdmin = !!token && token.role === "SUPER_ADMIN";

    if (!isSuperAdmin) {
      const loginUrl = new URL("/superadmin-giris", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    return createResponse();
  }

  // Eski sonbirsoz.com haber URL'leri (/haber-slug) → /kategori/haber-slug 301
  if (!pathname.startsWith("/admin")) {
    // Önce açık bölüm haritası (eski kategori/landing sayfaları)
    const sectionTarget = LEGACY_SECTION_REDIRECTS[pathname];
    if (sectionTarget) {
      return NextResponse.redirect(new URL(sectionTarget, request.url), 301);
    }
    // Eski il hava durumu sayfaları (/ankara-hava-durumu vb.) → servis sayfası
    if (/^\/[a-z0-9-]+-hava-durumu$/.test(pathname)) {
      return NextResponse.redirect(
        new URL("/servisler/hava-durumu", request.url),
        301
      );
    }
    const legacyRedirect = await handleLegacyArticleUrl(request);
    if (legacyRedirect) return legacyRedirect;
    // Admin dışı tüm yollar (public sayfalar) auth guard'a tabi değildir.
    return createResponse();
  }

  // Buradan itibaren yalnızca /admin/* yolları — auth guard uygulanır.
  // Demo/no-DB mode: skip auth entirely and let /admin/* through.
  // (Üretimde asla etkin değildir — isAuthBypassEnabled kontrolü.)
  if (isAuthBypassEnabled()) {
    if (pathname === "/admin/giris") {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
    return createResponse();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const isAuthed = !!token && ADMIN_ROLES.includes(token.role as string);

  // Signed-in users hitting the login page go straight to the dashboard.
  if (pathname === "/admin/giris") {
    if (isAuthed) {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
    return createResponse();
  }

  if (!isAuthed) {
    const loginUrl = new URL("/admin/giris", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return createResponse();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/superadmin/:path*",
    "/api/auth/callback/credentials",
    "/api/newsletter",
    "/api/articles/share",
    "/api/search",
    "/api/ai-search",
    // Eski kök seviye haber URL'i yakalama: statik dosyalar ve _next hariç
    // tüm tek-segment yollar (alt yol içermeyen). handleLegacyArticleUrl
    // içinde bilinen sayfalar (kategori/servis vb.) zaten atlanır.
    "/((?!_next/|.*\\..*).*)",
  ],
};
