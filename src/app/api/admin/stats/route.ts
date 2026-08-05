import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireEditor } from "@/lib/data/article-mutations";
import { requireTenantId } from "@/lib/tenant";

export async function GET(_request: NextRequest) {
  const user = await requireEditor();
  if (!user) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  try {
    const tenantId = await requireTenantId();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [
      totalArticles,
      statusBreakdown,
      viewCountResult,
      last7Days,
      topArticles,
      categoryStats,
      totalAuthors,
    ] = await Promise.all([
      prisma.article.count({ where: { tenantId } }),

      prisma.article.groupBy({
        by: ["status"],
        where: { tenantId },
        _count: { id: true },
      }),

      prisma.article.aggregate({
        where: { tenantId },
        _sum: { viewCount: true },
      }),

      prisma.article.count({
        where: {
          tenantId,
          status: "PUBLISHED",
          publishedAt: { gte: sevenDaysAgo },
        },
      }),

      prisma.article.findMany({
        where: { tenantId, status: "PUBLISHED" },
        orderBy: { viewCount: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          slug: true,
          viewCount: true,
          publishedAt: true,
          category: { select: { name: true, slug: true, color: true } },
        },
      }),

      prisma.category.findMany({
        where: { tenantId },
        include: { _count: { select: { articles: true } } },
        orderBy: { order: "asc" },
      }),

      prisma.author.count({ where: { tenantId, isActive: true } }),
    ]);

    const statusMap: Record<string, number> = {};
    for (const row of statusBreakdown) {
      statusMap[row.status] = row._count.id;
    }

    const categoryBreakdown = categoryStats
      .filter((c) => c._count.articles > 0)
      .map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        color: c.color,
        count: c._count.articles,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return NextResponse.json({
      data: {
        totalArticles,
        published: statusMap["PUBLISHED"] ?? 0,
        draft: statusMap["DRAFT"] ?? 0,
        review: statusMap["REVIEW"] ?? 0,
        archived: statusMap["ARCHIVED"] ?? 0,
        totalViews: viewCountResult._sum.viewCount ?? 0,
        last7Days,
        totalAuthors,
        topArticles,
        categoryBreakdown,
      },
    });
  } catch (error) {
    console.error("İstatistikler alınamadı:", error);
    return NextResponse.json({ error: "İstatistikler alınamadı." }, { status: 500 });
  }
}
