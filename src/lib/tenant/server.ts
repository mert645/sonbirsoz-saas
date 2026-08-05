import { headers } from "next/headers";
import { cache } from "react";
import { prisma } from "@/lib/db";
import type { TenantData } from "./context";

/**
 * Subdomain veya custom domain'den tenant slug'ını çıkarır
 * Örnekler:
 *   muzik.sonbirsoz-saas.com → "muzik"
 *   spor.sonbirsoz-saas.com → "spor"
 *   www.muzikhaberleri.com → custom domain lookup
 *   localhost:3000 → "demo" (development)
 */
export function getTenantSlugFromHost(host: string): string | null {
  // Development ortamı
  if (host.includes("localhost") || host.includes("127.0.0.1")) {
    return process.env.DEV_TENANT_SLUG || "demo";
  }

  // Platform ana domain'leri (admin, www, app)
  const platformDomains = ["admin", "www", "app", "api"];
  
  // Subdomain kontrolü: xxx.sonbirsoz-saas.com
  const baseDomain = process.env.BASE_DOMAIN || "sonbirsoz-saas.com";
  if (host.endsWith(baseDomain)) {
    const subdomain = host.replace(`.${baseDomain}`, "").split(".").pop();
    if (subdomain && !platformDomains.includes(subdomain)) {
      return subdomain;
    }
    return null; // Platform domain'i, tenant değil
  }

  // Custom domain - veritabanından lookup gerekecek
  return `custom:${host}`;
}

/**
 * Request'ten tenant'ı belirler (cached)
 */
export const getCurrentTenant = cache(async (): Promise<TenantData | null> => {
  const headersList = await headers();
  const host = headersList.get("host") || "";
  
  const slugOrDomain = getTenantSlugFromHost(host);
  
  if (!slugOrDomain) {
    return null;
  }

  // Custom domain lookup
  if (slugOrDomain.startsWith("custom:")) {
    const domain = slugOrDomain.replace("custom:", "");
    const tenant = await prisma.tenant.findUnique({
      where: { domain, isActive: true },
      include: { settings: true },
    });
    return tenant ? mapTenantToData(tenant) : null;
  }

  // Slug lookup
  const tenant = await prisma.tenant.findUnique({
    where: { slug: slugOrDomain, isActive: true },
    include: { settings: true },
  });

  return tenant ? mapTenantToData(tenant) : null;
});

/**
 * Tenant ID ile tenant'ı getirir
 */
export async function getTenantById(id: string): Promise<TenantData | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { id, isActive: true },
    include: { settings: true },
  });
  return tenant ? mapTenantToData(tenant) : null;
}

/**
 * Tenant slug ile tenant'ı getirir
 */
export async function getTenantBySlug(slug: string): Promise<TenantData | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { slug, isActive: true },
    include: { settings: true },
  });
  return tenant ? mapTenantToData(tenant) : null;
}

// Prisma tenant'ını TenantData'ya dönüştürür
function mapTenantToData(tenant: {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  logo: string | null;
  favicon: string | null;
  primaryColor: string;
  plan: "STARTER" | "PROFESSIONAL" | "ENTERPRISE";
  settings: {
    siteName: string | null;
    tagline: string | null;
    aiGenerationEnabled: boolean;
    aiModerationEnabled: boolean;
    videoStudioEnabled: boolean;
    newsletterEnabled: boolean;
    pushEnabled: boolean;
    customDomainEnabled: boolean;
    apiAccessEnabled: boolean;
  } | null;
}): TenantData {
  return {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    domain: tenant.domain,
    logo: tenant.logo,
    favicon: tenant.favicon,
    primaryColor: tenant.primaryColor,
    plan: tenant.plan,
    settings: tenant.settings,
  };
}
