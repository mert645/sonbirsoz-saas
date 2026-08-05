import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  withApiKey,
  apiSuccess,
  apiError,
  parsePagination,
  parseSort,
} from "@/lib/api/middleware";
import { hasScope } from "@/lib/api/keys";

/**
 * GET /api/v1/articles
 * Makaleleri listeler
 */
export async function GET(request: NextRequest) {
  const ctx = await withApiKey(request, "articles:read");
  if (ctx instanceof Response) return ctx;

  try {
    const { page, limit, skip } = parsePagination(request);
    const { field, order } = parseSort(
      request,
      ["createdAt", "publishedAt", "title", "viewCount"],
      "publishedAt"
    );

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const categoryId = searchParams.get("categoryId");
    const authorId = searchParams.get("authorId");
    const search = searchParams.get("search");

    // Where koşulları
    const where: Record<string, unknown> = {
      tenantId: ctx.tenantId,
    };

    if (status) {
      where.status = status;
    } else {
      // Varsayılan olarak sadece yayınlanmış makaleler
      where.status = "PUBLISHED";
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (authorId) {
      where.authorId = authorId;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { spot: { contains: search, mode: "insensitive" } },
      ];
    }

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        select: {
          id: true,
          title: true,
          slug: true,
          spot: true,
          imageUrl: true,
          status: true,
          viewCount: true,
          publishedAt: true,
          createdAt: true,
          updatedAt: true,
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          author: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          tags: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: { [field]: order },
        skip,
        take: limit,
      }),
      prisma.article.count({ where }),
    ]);

    return apiSuccess(articles, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("API Error - GET /articles:", error);
    return apiError("Makaleler yüklenirken hata oluştu", 500);
  }
}

/**
 * POST /api/v1/articles
 * Yeni makale oluşturur
 */
export async function POST(request: NextRequest) {
  const ctx = await withApiKey(request, "articles:write");
  if (ctx instanceof Response) return ctx;

  try {
    const body = await request.json();
    const {
      title,
      slug,
      spot,
      content,
      imageUrl,
      categoryId,
      authorId,
      tags,
      status = "DRAFT",
    } = body;

    // Validasyon
    if (!title || !content || !categoryId) {
      return apiError("title, content ve categoryId zorunludur", 400);
    }

    // Slug oluştur veya kontrol et
    const finalSlug = slug || title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 100);

    // Slug benzersizlik kontrolü
    const existingSlug = await prisma.article.findFirst({
      where: { tenantId: ctx.tenantId, slug: finalSlug },
    });

    if (existingSlug) {
      return apiError("Bu slug zaten kullanılıyor", 400);
    }

    // Kategori kontrolü
    const category = await prisma.category.findFirst({
      where: { id: categoryId, tenantId: ctx.tenantId },
    });

    if (!category) {
      return apiError("Kategori bulunamadı", 404);
    }

    // Yazar kontrolü (opsiyonel)
    if (authorId) {
      const author = await prisma.author.findFirst({
        where: { id: authorId, tenantId: ctx.tenantId },
      });

      if (!author) {
        return apiError("Yazar bulunamadı", 404);
      }
    }

    // Makale oluştur
    const article = await prisma.article.create({
      data: {
        tenantId: ctx.tenantId,
        title,
        slug: finalSlug,
        spot,
        content,
        imageUrl,
        categoryId,
        authorId,
        status,
        publishedAt: status === "PUBLISHED" ? new Date() : null,
        tags: tags?.length
          ? {
              connectOrCreate: tags.map((tag: string) => ({
                where: {
                  tenantId_slug: {
                    tenantId: ctx.tenantId,
                    slug: tag.toLowerCase().replace(/\s+/g, "-"),
                  },
                },
                create: {
                  tenantId: ctx.tenantId,
                  name: tag,
                  slug: tag.toLowerCase().replace(/\s+/g, "-"),
                },
              })),
            }
          : undefined,
      },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        author: {
          select: { id: true, name: true, slug: true },
        },
        tags: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    return apiSuccess(article);
  } catch (error) {
    console.error("API Error - POST /articles:", error);
    return apiError("Makale oluşturulurken hata oluştu", 500);
  }
}
