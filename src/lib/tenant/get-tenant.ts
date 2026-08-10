import { headers } from "next/headers";
import { prisma } from "@/lib/db";

export interface TenantContext {
  id: string;
  name: string;
  slug: string;
  plan: "STARTER" | "PROFESSIONAL" | "ENTERPRISE";
  settings: {
    aiGenerationEnabled: boolean;
    aiModerationEnabled: boolean;
    videoStudioEnabled: boolean;
    newsletterEnabled: boolean;
    pushEnabled: boolean;
  } | null;
}

/**
 * Server-side: Request header'larından tenant slug'ını alır
 */
async function getTenantSlug(): Promise<string> {
  const headersList = await headers();
  const tenantSlug = headersList.get("x-tenant-slug");
  return tenantSlug || process.env.DEV_TENANT_SLUG || "demo";
}

/**
 * Server-side: Request header'larından tenant'ı belirler
 * Proxy.ts tarafından x-tenant-slug header'ı eklenir
 */
export async function getCurrentTenantId(): Promise<string | null> {
  const tenantSlug = await getTenantSlug();

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug, isActive: true },
    select: { id: true },
  });

  return tenant?.id || null;
}

/**
 * Server-side: Tam tenant context'i döner
 */
export async function getCurrentTenant(): Promise<TenantContext | null> {
  const tenantSlug = await getTenantSlug();

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug, isActive: true },
    include: {
      settings: {
        select: {
          aiGenerationEnabled: true,
          aiModerationEnabled: true,
          videoStudioEnabled: true,
          newsletterEnabled: true,
          pushEnabled: true,
        },
      },
    },
  });

  if (!tenant) return null;

  return {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    plan: tenant.plan,
    settings: tenant.settings,
  };
}

/**
 * API route'larında kullanmak için tenant ID'yi zorunlu olarak alır
 * Tenant bulunamazsa hata fırlatır
 */
export async function requireTenantId(): Promise<string> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    throw new Error("Tenant not found");
  }
  return tenantId;
}

/**
 * Prisma query'lerine tenant filtresi ekler
 */
export function withTenant<T extends Record<string, unknown>>(
  tenantId: string,
  where?: T
): T & { tenantId: string } {
  return { ...where, tenantId } as T & { tenantId: string };
}
