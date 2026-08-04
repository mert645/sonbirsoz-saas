import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Subdomain tabanlı tenant routing middleware
 * 
 * Örnekler:
 *   muzik.sonbirsoz-saas.com/admin → tenant: muzik
 *   spor.sonbirsoz-saas.com/haberler → tenant: spor
 *   admin.sonbirsoz-saas.com → super admin panel
 *   localhost:3000 → demo tenant (development)
 */
export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const host = request.headers.get("host") || "";
  
  // Development ortamı - tenant header ekle
  if (host.includes("localhost") || host.includes("127.0.0.1")) {
    const response = NextResponse.next();
    response.headers.set("x-tenant-slug", process.env.DEV_TENANT_SLUG || "demo");
    return response;
  }

  const baseDomain = process.env.BASE_DOMAIN || "sonbirsoz-saas.com";
  
  // Platform subdomain'leri (tenant değil)
  const platformSubdomains = ["admin", "www", "app", "api"];
  
  // Subdomain'i çıkar
  if (host.endsWith(baseDomain)) {
    const subdomain = host.replace(`.${baseDomain}`, "").split(".").pop();
    
    // Super admin panel
    if (subdomain === "admin") {
      // Super admin route'larına izin ver
      if (url.pathname.startsWith("/superadmin")) {
        return NextResponse.next();
      }
      // Diğer route'ları superadmin'e yönlendir
      return NextResponse.redirect(new URL("/superadmin", request.url));
    }
    
    // Platform subdomain'leri
    if (subdomain && platformSubdomains.includes(subdomain)) {
      return NextResponse.next();
    }
    
    // Tenant subdomain'i
    if (subdomain) {
      const response = NextResponse.next();
      response.headers.set("x-tenant-slug", subdomain);
      return response;
    }
  }
  
  // Custom domain - header'a domain ekle
  const response = NextResponse.next();
  response.headers.set("x-tenant-domain", host);
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
