import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const revalidate = 60;

interface TickerItem {
  text: string;
  href: string | null;
  critical: boolean;
  at: string;
}

/**
 * Kayan Son Dakika ticker'ı için public endpoint.
 * Öncelik: cron'un ürettiği AI özetleri (SiteSettings.breaking_ticker);
 * yoksa en yeni breaking/yayınlanmış haber başlıkları.
 */
export async function GET() {
  try {
    const setting = await prisma.siteSettings.findUnique({
      where: { key: "breaking_ticker" },
    });
    const value = setting?.value as { items?: TickerItem[]; updatedAt?: string } | null;
    if (value?.items && value.items.length > 0) {
      return NextResponse.json(
        { items: value.items, updatedAt: value.updatedAt || null },
        { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
      );
    }
  } catch {
    // DB erişilemezse aşağıdaki fallback'e düş
  }

  try {
    const articles = await prisma.article.findMany({
      where: { status: "PUBLISHED", publishedAt: { not: null } },
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
