import { prisma } from "@/lib/db";

/**
 * Data access layer for articles.
 *
 * Every function is defensive: if the database is unreachable or empty
 * (e.g. a fresh deploy before any content is seeded), it returns null or an
 * empty array so pages can gracefully fall back to their curated demo content.
 * This keeps the site presentable at all times.
 */

export interface ArticleListItem {
  id: string;
  title: string;
  slug: string;
  spot: string | null;
  coverImage: string | null;
  publishedAt: Date | null;
  readingTime: number;
  viewCount: number;
  category: { name: string; slug: string; color: string };
  author: { name: string; slug: string; avatar: string | null };
}

export interface ArticleDetail extends ArticleListItem {
  content: string;
  updatedAt: Date;
  shareCount: number;
  coverImageAlt: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  audioUrl: string | null;
  author: {
    name: string;
    slug: string;
    avatar: string | null;
    bio: string | null;
  };
  tags: { name: string; slug: string }[];
}

const listSelect = {
  id: true,
  title: true,
  slug: true,
  spot: true,
  coverImage: true,
  publishedAt: true,
  readingTime: true,
  viewCount: true,
  category: { select: { name: true, slug: true, color: true } },
  author: { select: { name: true, slug: true, avatar: true } },
} as const;

export async function getLatestArticles(limit = 12): Promise<ArticleListItem[]> {
  try {
    const rows = await prisma.article.findMany({
      where: { status: "PUBLISHED", publishedAt: { not: null } },
      orderBy: { publishedAt: "desc" },
      take: limit,
      select: listSelect,
    });
    return rows as ArticleListItem[];
  } catch {
    return [];
  }
}

export async function getFeaturedArticles(
  limit = 5
): Promise<ArticleListItem[]> {
  try {
    const rows = await prisma.article.findMany({
      where: {
        status: "PUBLISHED",
        publishedAt: { not: null },
        isFeatured: true,
      },
      orderBy: { publishedAt: "desc" },
      take: limit,
      select: listSelect,
    });
    return rows as ArticleListItem[];
  } catch {
    return [];
  }
}

export async function getBreakingArticles(
  limit = 6
): Promise<ArticleListItem[]> {
  try {
    const rows = await prisma.article.findMany({
      where: {
        status: "PUBLISHED",
        publishedAt: { not: null },
        isBreaking: true,
      },
      orderBy: { publishedAt: "desc" },
      take: limit,
      select: listSelect,
    });
    return rows as ArticleListItem[];
  } catch {
    return [];
  }
}

export async function getArticlesByCategory(
  categorySlug: string,
  { page = 1, limit = 12 }: { page?: number; limit?: number } = {}
): Promise<{ articles: ArticleListItem[]; total: number }> {
  try {
    const where = {
      status: "PUBLISHED" as const,
      publishedAt: { not: null },
      category: { slug: categorySlug },
    };
    const [rows, total] = await Promise.all([
      prisma.article.findMany({
        where,
        orderBy: { publishedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: listSelect,
      }),
      prisma.article.count({ where }),
    ]);
    return { articles: rows as ArticleListItem[], total };
  } catch {
    return { articles: [], total: 0 };
  }
}

export async function getMostViewedArticles(
  limit = 10
): Promise<ArticleListItem[]> {
  try {
    const rows = await prisma.article.findMany({
      where: { status: "PUBLISHED", publishedAt: { not: null } },
      orderBy: { viewCount: "desc" },
      take: limit,
      select: listSelect,
    });
    return rows as ArticleListItem[];
  } catch {
    return [];
  }
}

export async function getArticleBySlug(
  slug: string
): Promise<ArticleDetail | null> {
  try {
    const row = await prisma.article.findFirst({
      where: { slug, status: "PUBLISHED" },
      select: {
        ...listSelect,
        content: true,
        updatedAt: true,
        shareCount: true,
        coverImageAlt: true,
        seoTitle: true,
        seoDescription: true,
        audioUrl: true,
        author: {
          select: { name: true, slug: true, avatar: true, bio: true },
        },
        tags: { select: { tag: { select: { name: true, slug: true } } } },
      },
    });
    if (!row) return null;

    const tagRows =
      (row.tags as { tag: { name: string; slug: string } }[]) ?? [];
    const { tags: _tags, ...rest } = row;
    void _tags;

    return {
      ...rest,
      tags: tagRows.map((t) => t.tag),
    } as ArticleDetail;
  } catch {
    return null;
  }
}

/**
 * Eski sonbirsoz.com kök seviye URL'i (`/haber-slug`) için makalenin
 * kategorisini döndürür — yeni `/kategori/haber-slug` adresine 301
 * yönlendirmede kullanılır. Tüm makaleyi çekmeden yalnızca kategori slug'ı.
 */
export async function getCategorySlugForArticle(
  slug: string
): Promise<string | null> {
  try {
    const row = await prisma.article.findFirst({
      where: { slug, status: "PUBLISHED" },
      select: { category: { select: { slug: true } } },
    });
    return row?.category.slug ?? null;
  } catch {
    return null;
  }
}

export async function incrementViewCount(id: string): Promise<void> {
  try {
    await prisma.article.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });
  } catch {
    // View counting is best-effort; ignore failures.
  }
}

export async function incrementShareCount(id: string): Promise<void> {
  try {
    await prisma.article.update({
      where: { id },
      data: { shareCount: { increment: 1 } },
    });
  } catch {
    // Share counting is best-effort; ignore failures.
  }
}

/**
 * Fetches the latest articles for a list of category slugs in a single query.
 * Returns a map of categorySlug → ArticleListItem[].
 */
export async function getArticlesForCategories(
  categorySlugs: string[],
  perCategory = 5
): Promise<Record<string, ArticleListItem[]>> {
  try {
    const rows = await prisma.article.findMany({
      where: {
        status: "PUBLISHED",
        publishedAt: { not: null },
        category: { slug: { in: categorySlugs } },
      },
      orderBy: { publishedAt: "desc" },
      take: categorySlugs.length * perCategory * 2,
      select: listSelect,
    });

    const map: Record<string, ArticleListItem[]> = {};
    for (const slug of categorySlugs) map[slug] = [];
    for (const row of rows as ArticleListItem[]) {
      const slug = row.category.slug;
      if (map[slug] && map[slug].length < perCategory) map[slug].push(row);
    }
    return map;
  } catch {
    const map: Record<string, ArticleListItem[]> = {};
    for (const slug of categorySlugs) map[slug] = [];
    return map;
  }
}

/**
 * Fetches articles published exactly one year ago (±3 days) for the
 * "Geçen Yıl Bugün" widget.
 */
export async function getYearAgoArticles(limit = 4): Promise<ArticleListItem[]> {
  try {
    const now = new Date();
    const yearAgo = new Date(now);
    yearAgo.setFullYear(now.getFullYear() - 1);
    const from = new Date(yearAgo);
    from.setDate(from.getDate() - 3);
    const to = new Date(yearAgo);
    to.setDate(to.getDate() + 3);

    const rows = await prisma.article.findMany({
      where: {
        status: "PUBLISHED",
        publishedAt: { gte: from, lte: to },
      },
      orderBy: { viewCount: "desc" },
      take: limit,
      select: listSelect,
    });
    return rows as ArticleListItem[];
  } catch {
    return [];
  }
}

/**
 * Foto Galeri bölümü: kapak görseli olan en güncel haberler (görsel-ağırlıklı grid).
 */
export async function getGalleryArticles(
  { page = 1, limit = 24 }: { page?: number; limit?: number } = {}
): Promise<{ articles: ArticleListItem[]; total: number }> {
  try {
    const where = {
      status: "PUBLISHED" as const,
      publishedAt: { not: null },
      coverImage: { not: null },
    };
    const [rows, total] = await Promise.all([
      prisma.article.findMany({
        where,
        orderBy: { publishedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: listSelect,
      }),
      prisma.article.count({ where }),
    ]);
    return { articles: rows as ArticleListItem[], total };
  } catch {
    return { articles: [], total: 0 };
  }
}

export interface VideoArticleItem extends ArticleListItem {
  videoUrl: string;
}

/**
 * Video bölümü: üretilmiş (COMPLETED) Shorts videosu olan haberler.
 */
export async function getVideoArticles(
  { page = 1, limit = 24 }: { page?: number; limit?: number } = {}
): Promise<{ articles: VideoArticleItem[]; total: number }> {
  try {
    const videoRows = await prisma.mediaGeneration.findMany({
      where: {
        purpose: "VIDEO",
        status: "COMPLETED",
        resultUrl: { not: null },
        article: { status: "PUBLISHED" },
      },
      orderBy: { completedAt: "desc" },
      distinct: ["articleId"],
      select: {
        resultUrl: true,
        article: { select: listSelect },
      },
    });

    const all = videoRows
      .filter((r) => r.article && r.resultUrl)
      .map((r) => ({
        ...(r.article as ArticleListItem),
        videoUrl: r.resultUrl as string,
      }));

    const total = all.length;
    const start = (page - 1) * limit;
    return { articles: all.slice(start, start + limit), total };
  } catch {
    return { articles: [], total: 0 };
  }
}

export async function searchArticles(
  query: string,
  { categorySlug, limit = 24 }: { categorySlug?: string; limit?: number } = {}
): Promise<ArticleListItem[]> {
  if (!query.trim()) return [];
  try {
    const rows = await prisma.article.findMany({
      where: {
        status: "PUBLISHED",
        publishedAt: { not: null },
        ...(categorySlug && categorySlug !== "all"
          ? { category: { slug: categorySlug } }
          : {}),
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { spot: { contains: query, mode: "insensitive" } },
          { content: { contains: query, mode: "insensitive" } },
        ],
      },
      orderBy: { publishedAt: "desc" },
      take: limit,
      select: listSelect,
    });
    return rows as ArticleListItem[];
  } catch {
    return [];
  }
}
