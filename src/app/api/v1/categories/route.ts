import { prisma } from "@/lib/db";
import { v1Json } from "@/lib/api/v1";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/categories — aktif kategori listesi (mobil sekme/menü).
 */
export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
      select: {
        name: true,
        slug: true,
        color: true,
        description: true,
        _count: {
          select: { articles: { where: { status: "PUBLISHED" } } },
        },
      },
    });
    return v1Json(
      categories.map((c) => ({
        name: c.name,
        slug: c.slug,
        color: c.color,
        description: c.description,
        articleCount: c._count.articles,
      })),
      { maxAge: 600, staleWhileRevalidate: 3600 }
    );
  } catch {
    return v1Json([], { maxAge: 60 });
  }
}
