import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  withApiKey,
  apiSuccess,
  apiError,
  parsePagination,
} from "@/lib/api/middleware";

/**
 * GET /api/v1/media
 * Medya dosyalarını listeler
 */
export async function GET(request: NextRequest) {
  const ctx = await withApiKey(request, "media:read");
  if (ctx instanceof Response) return ctx;

  try {
    const { page, limit, skip } = parsePagination(request);
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // image, video, audio
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {
      tenantId: ctx.tenantId,
    };

    if (type) {
      where.type = type.toUpperCase();
    }

    if (search) {
      where.OR = [
        { filename: { contains: search, mode: "insensitive" } },
        { alt: { contains: search, mode: "insensitive" } },
      ];
    }

    const [media, total] = await Promise.all([
      prisma.media.findMany({
        where,
        select: {
          id: true,
          filename: true,
          url: true,
          type: true,
          size: true,
          width: true,
          height: true,
          alt: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.media.count({ where }),
    ]);

    return apiSuccess(media, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("API Error - GET /media:", error);
    return apiError("Medya dosyaları yüklenirken hata oluştu", 500);
  }
}

/**
 * POST /api/v1/media
 * Medya URL'i kaydeder (upload için ayrı endpoint gerekli)
 */
export async function POST(request: NextRequest) {
  const ctx = await withApiKey(request, "media:write");
  if (ctx instanceof Response) return ctx;

  try {
    const body = await request.json();
    const { url, filename, type, size, width, height, alt } = body;

    if (!url || !filename) {
      return apiError("url ve filename zorunludur", 400);
    }

    const media = await prisma.media.create({
      data: {
        tenantId: ctx.tenantId,
        url,
        filename,
        type: type?.toUpperCase() || "IMAGE",
        size: size || 0,
        width,
        height,
        alt,
      },
    });

    return apiSuccess(media);
  } catch (error) {
    console.error("API Error - POST /media:", error);
    return apiError("Medya kaydedilirken hata oluştu", 500);
  }
}
