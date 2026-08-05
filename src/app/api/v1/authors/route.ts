import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  withApiKey,
  apiSuccess,
  apiError,
  parsePagination,
} from "@/lib/api/middleware";

/**
 * GET /api/v1/authors
 * Yazarları listeler
 */
export async function GET(request: NextRequest) {
  const ctx = await withApiKey(request, "authors:read");
  if (ctx instanceof Response) return ctx;

  try {
    const { page, limit, skip } = parsePagination(request);
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const includeCount = searchParams.get("includeCount") === "true";

    const where: Record<string, unknown> = {
      tenantId: ctx.tenantId,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const [authors, total] = await Promise.all([
      prisma.author.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          email: true,
          bio: true,
          imageUrl: true,
          socialLinks: true,
          createdAt: true,
          ...(includeCount && {
            _count: {
              select: { articles: true },
            },
          }),
        },
        orderBy: { name: "asc" },
        skip,
        take: limit,
      }),
      prisma.author.count({ where }),
    ]);

    return apiSuccess(authors, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("API Error - GET /authors:", error);
    return apiError("Yazarlar yüklenirken hata oluştu", 500);
  }
}

/**
 * POST /api/v1/authors
 * Yeni yazar oluşturur
 */
export async function POST(request: NextRequest) {
  const ctx = await withApiKey(request, "authors:write");
  if (ctx instanceof Response) return ctx;

  try {
    const body = await request.json();
    const { name, slug, email, bio, imageUrl, socialLinks } = body;

    if (!name) {
      return apiError("Yazar adı zorunludur", 400);
    }

    const finalSlug = slug || name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");

    // Slug benzersizlik kontrolü
    const existingSlug = await prisma.author.findFirst({
      where: { tenantId: ctx.tenantId, slug: finalSlug },
    });

    if (existingSlug) {
      return apiError("Bu slug zaten kullanılıyor", 400);
    }

    // Email benzersizlik kontrolü
    if (email) {
      const existingEmail = await prisma.author.findFirst({
        where: { tenantId: ctx.tenantId, email },
      });

      if (existingEmail) {
        return apiError("Bu email zaten kullanılıyor", 400);
      }
    }

    const author = await prisma.author.create({
      data: {
        tenantId: ctx.tenantId,
        name,
        slug: finalSlug,
        email,
        bio,
        imageUrl,
        socialLinks,
      },
    });

    return apiSuccess(author);
  } catch (error) {
    console.error("API Error - POST /authors:", error);
    return apiError("Yazar oluşturulurken hata oluştu", 500);
  }
}
