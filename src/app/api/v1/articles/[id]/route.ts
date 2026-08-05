import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { withApiKey, apiSuccess, apiError } from "@/lib/api/middleware";

/**
 * GET /api/v1/articles/[id]
 * Makale detayını getirir
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await withApiKey(request, "articles:read");
  if (ctx instanceof Response) return ctx;

  const { id } = await params;

  try {
    const article = await prisma.article.findFirst({
      where: {
        tenantId: ctx.tenantId,
        OR: [{ id }, { slug: id }], // ID veya slug ile arama
      },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        author: {
          select: { id: true, name: true, slug: true, bio: true, imageUrl: true },
        },
        tags: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (!article) {
      return apiError("Makale bulunamadı", 404);
    }

    return apiSuccess(article);
  } catch (error) {
    console.error("API Error - GET /articles/[id]:", error);
    return apiError("Makale yüklenirken hata oluştu", 500);
  }
}

/**
 * PATCH /api/v1/articles/[id]
 * Makaleyi günceller
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await withApiKey(request, "articles:write");
  if (ctx instanceof Response) return ctx;

  const { id } = await params;

  try {
    // Makale kontrolü
    const existing = await prisma.article.findFirst({
      where: { id, tenantId: ctx.tenantId },
    });

    if (!existing) {
      return apiError("Makale bulunamadı", 404);
    }

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
      status,
    } = body;

    // Slug değişiyorsa benzersizlik kontrolü
    if (slug && slug !== existing.slug) {
      const slugExists = await prisma.article.findFirst({
        where: {
          tenantId: ctx.tenantId,
          slug,
          NOT: { id },
        },
      });

      if (slugExists) {
        return apiError("Bu slug zaten kullanılıyor", 400);
      }
    }

    // Kategori kontrolü
    if (categoryId) {
      const category = await prisma.category.findFirst({
        where: { id: categoryId, tenantId: ctx.tenantId },
      });

      if (!category) {
        return apiError("Kategori bulunamadı", 404);
      }
    }

    // Güncelleme verisi
    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (slug !== undefined) updateData.slug = slug;
    if (spot !== undefined) updateData.spot = spot;
    if (content !== undefined) updateData.content = content;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (authorId !== undefined) updateData.authorId = authorId;
    if (status !== undefined) {
      updateData.status = status;
      // Yayınlanıyorsa publishedAt güncelle
      if (status === "PUBLISHED" && existing.status !== "PUBLISHED") {
        updateData.publishedAt = new Date();
      }
    }

    const article = await prisma.article.update({
      where: { id },
      data: {
        ...updateData,
        tags: tags?.length
          ? {
              set: [], // Önce mevcut tag'leri kaldır
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
    console.error("API Error - PATCH /articles/[id]:", error);
    return apiError("Makale güncellenirken hata oluştu", 500);
  }
}

/**
 * DELETE /api/v1/articles/[id]
 * Makaleyi siler
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await withApiKey(request, "articles:delete");
  if (ctx instanceof Response) return ctx;

  const { id } = await params;

  try {
    // Makale kontrolü
    const existing = await prisma.article.findFirst({
      where: { id, tenantId: ctx.tenantId },
    });

    if (!existing) {
      return apiError("Makale bulunamadı", 404);
    }

    await prisma.article.delete({
      where: { id },
    });

    return apiSuccess({ deleted: true, id });
  } catch (error) {
    console.error("API Error - DELETE /articles/[id]:", error);
    return apiError("Makale silinirken hata oluştu", 500);
  }
}
