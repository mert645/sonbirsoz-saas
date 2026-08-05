import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  withApiKey,
  apiSuccess,
  apiError,
  parsePagination,
} from "@/lib/api/middleware";

/**
 * GET /api/v1/categories
 * Kategorileri listeler
 */
export async function GET(request: NextRequest) {
  const ctx = await withApiKey(request, "categories:read");
  if (ctx instanceof Response) return ctx;

  try {
    const { page, limit, skip } = parsePagination(request);
    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get("parentId");
    const includeCount = searchParams.get("includeCount") === "true";

    const where: Record<string, unknown> = {
      tenantId: ctx.tenantId,
    };

    if (parentId === "null") {
      where.parentId = null; // Sadece üst kategoriler
    } else if (parentId) {
      where.parentId = parentId;
    }

    const [categories, total] = await Promise.all([
      prisma.category.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          imageUrl: true,
          parentId: true,
          order: true,
          createdAt: true,
          ...(includeCount && {
            _count: {
              select: { articles: true },
            },
          }),
          children: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: [{ order: "asc" }, { name: "asc" }],
        skip,
        take: limit,
      }),
      prisma.category.count({ where }),
    ]);

    return apiSuccess(categories, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("API Error - GET /categories:", error);
    return apiError("Kategoriler yüklenirken hata oluştu", 500);
  }
}

/**
 * POST /api/v1/categories
 * Yeni kategori oluşturur
 */
export async function POST(request: NextRequest) {
  const ctx = await withApiKey(request, "categories:write");
  if (ctx instanceof Response) return ctx;

  try {
    const body = await request.json();
    const { name, slug, description, imageUrl, parentId, order } = body;

    if (!name) {
      return apiError("Kategori adı zorunludur", 400);
    }

    const finalSlug = slug || name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");

    // Slug benzersizlik kontrolü
    const existingSlug = await prisma.category.findFirst({
      where: { tenantId: ctx.tenantId, slug: finalSlug },
    });

    if (existingSlug) {
      return apiError("Bu slug zaten kullanılıyor", 400);
    }

    // Parent kontrolü
    if (parentId) {
      const parent = await prisma.category.findFirst({
        where: { id: parentId, tenantId: ctx.tenantId },
      });

      if (!parent) {
        return apiError("Üst kategori bulunamadı", 404);
      }
    }

    const category = await prisma.category.create({
      data: {
        tenantId: ctx.tenantId,
        name,
        slug: finalSlug,
        description,
        imageUrl,
        parentId,
        order: order || 0,
      },
    });

    return apiSuccess(category);
  } catch (error) {
    console.error("API Error - POST /categories:", error);
    return apiError("Kategori oluşturulurken hata oluştu", 500);
  }
}
