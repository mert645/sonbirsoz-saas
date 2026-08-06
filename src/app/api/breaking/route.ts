import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentTenantId } from "@/lib/tenant";

export const revalidate = 60;

interface TickerItem {
  text: string;
  href: string | null;
  critical: boolean;
  at: string;
}

/**
 * Kayan Son Dakika ticker'ı için public endpoint.
 * Tenant-aware: Sadece mevcut tenant'ın haberlerini gösterir.
 */
export async function GET() {
  const tenantId = await getCurrentTenantId();
  
  if (!tenantId) {
    return NextResponse.json({ items: [], updatedAt: null });
  }

  try {
    const articles = await prisma.article.findMany({
      where: { 
        tenantId,
        status: "PUBLISHED", 
        publishedAt: { not: null } 
      },
      orderBy: [{ isBreaking: "desc" }, { publishedAt: "desc" }],
      take: 6,
      select: {
        title: true,
        slug: true,
        isBreaking: true,
        publishedAt: true,
        category: { select: { slug: true } },
      },
    });
    const items: TickerItem[] = articles.map((a) => ({
      text: a.title,
      href: `/${a.category.slug}/${a.slug}`,
      critical: a.isBreaking,
      at: (a.publishedAt || new Date()).toISOString(),
    }));
    return NextResponse.json(
      { items, updatedAt: null },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
    );
  } catch {
    return NextResponse.json({ items: [], updatedAt: null });
  }
}
