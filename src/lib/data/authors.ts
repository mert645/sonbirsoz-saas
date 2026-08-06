import { prisma } from "@/lib/db";
import type { ArticleListItem } from "./articles";

export interface AuthorProfile {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  avatar: string | null;
  email: string | null;
  expertise: string[];
  socialLinks: Record<string, string> | null;
  isActive: boolean;
  articleCount: number;
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

export async function getAuthorBySlug(
  slug: string,
  tenantId?: string
): Promise<AuthorProfile | null> {
  try {
    const where: { slug: string; tenantId?: string } = { slug };
    if (tenantId) where.tenantId = tenantId;

    const author = await prisma.author.findFirst({
      where,
      include: { _count: { select: { articles: true } } },
    });
    if (!author) return null;

    return {
      id: author.id,
      name: author.name,
      slug: author.slug,
      bio: author.bio,
      avatar: author.avatar,
      email: author.email,
      expertise: author.expertise,
      socialLinks: author.socialLinks as Record<string, string> | null,
      isActive: author.isActive,
      articleCount: author._count.articles,
    };
  } catch {
    return null;
  }
}

export async function getArticlesByAuthor(
  slug: string,
  { page = 1, limit = 12, tenantId }: { page?: number; limit?: number; tenantId?: string } = {}
): Promise<{ articles: ArticleListItem[]; total: number }> {
  try {
    const where: Record<string, unknown> = {
      status: "PUBLISHED" as const,
      publishedAt: { not: null },
      author: { slug },
    };
    if (tenantId) where.tenantId = tenantId;

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

export async function getActiveAuthors(limit = 8, tenantId?: string): Promise<AuthorProfile[]> {
  try {
    const where: { isActive: boolean; tenantId?: string } = { isActive: true };
    if (tenantId) where.tenantId = tenantId;

    const rows = await prisma.author.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: limit,
      include: { _count: { select: { articles: true } } },
    });
    return rows.map((a) => ({
      id: a.id,
      name: a.name,
      slug: a.slug,
      bio: a.bio,
      avatar: a.avatar,
      email: a.email,
      expertise: a.expertise,
      socialLinks: a.socialLinks as Record<string, string> | null,
      isActive: a.isActive,
      articleCount: a._count.articles,
    }));
  } catch {
    return [];
  }
}

/**
 * /yazarlar dizin sayfası: tüm aktif yazarlar, yayınlanan haber sayısına göre.
 */
export async function getAllAuthors(tenantId?: string): Promise<AuthorProfile[]> {
  try {
    const where: { isActive: boolean; tenantId?: string } = { isActive: true };
    if (tenantId) where.tenantId = tenantId;

    const rows = await prisma.author.findMany({
      where,
      include: {
        _count: {
          select: { articles: { where: { status: "PUBLISHED" } } },
        },
      },
    });
    return rows
      .map((a) => ({
        id: a.id,
        name: a.name,
        slug: a.slug,
        bio: a.bio,
        avatar: a.avatar,
        email: a.email,
        expertise: a.expertise,
        socialLinks: a.socialLinks as Record<string, string> | null,
        isActive: a.isActive,
        articleCount: a._count.articles,
      }))
      .sort((a, b) => b.articleCount - a.articleCount);
  } catch {
    return [];
  }
}
