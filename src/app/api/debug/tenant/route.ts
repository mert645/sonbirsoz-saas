import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const headersList = await headers();
  const tenantSlug = headersList.get("x-tenant-slug");
  const host = headersList.get("host");
  
  // Direkt olarak tenant'ı bul (fonksiyon kullanmadan)
  let tenantDirect = null;
  const slugToUse = tenantSlug || process.env.DEV_TENANT_SLUG || "demo";
  
  tenantDirect = await prisma.tenant.findUnique({
    where: { slug: slugToUse, isActive: true },
    select: { id: true, name: true, slug: true, plan: true },
  });

  return NextResponse.json({
    tenantSlug,
    slugToUse,
    host,
    tenantDirect,
    envDevTenantSlug: process.env.DEV_TENANT_SLUG || "not set",
  });
}
