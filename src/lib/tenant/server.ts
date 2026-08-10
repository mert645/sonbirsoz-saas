import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import type { TenantData } from "./context";

/**
 * Request'ten tenant'ı belirler
 * Proxy tarafından eklenen x-tenant-slug header'ını kullanır
 */
export async function getCurrentTenant(): Promise<TenantData | null> {
  const headersList = await headers();
  
  // Proxy tarafından eklenen tenant slug header'ını al
  const tenantSlug = headersList.get("x-tenant-slug");
  
  if (!tenantSlug) {
    // Fallback: DEV_TENANT_SLUG veya demo
    const fallbackSlug = process.env.DEV_TENANT_SLUG || "demo";
    const tenant = await prisma.tenant.findUnique({
      where: { slug: fallbackSlug, isActive: true },
      include: { settings: true },
    });
    return tenant ? mapTenantToData(tenant) : null;
  }

  // Custom domain lookup (custom: prefix ile)
  if (tenantSlug.startsWith("custom:")) {
    const domain = tenantSlug.replace("custom:", "");
    const tenant = await prisma.tenant.findUnique({
      where: { domain, isActive: true },
      include: { settings: true },
    });
    return tenant ? mapTenantToData(tenant) : null;
  }

  // Slug lookup
  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug, isActive: true },
    include: { settings: true },
  });

  return tenant ? mapTenantToData(tenant) : null;
}

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
