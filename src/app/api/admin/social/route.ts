import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireEditor } from "@/lib/data/article-mutations";

export async function GET(request: NextRequest) {
  const auth = await requireEditor();
  if (!auth) return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const statusFilter = searchParams.get("status"); // POSTED | SCHEDULED | FAILED | null
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = 30;

  const where = statusFilter ? { status: statusFilter as never } : {};

  const [posts, total] = await Promise.all([
    prisma.socialPost.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        platform: true,
        status: true,
        content: true,
        scheduledAt: true,
        postedAt: true,
        externalId: true,
        error: true,
        metrics: true,
        createdAt: true,
        article: {
          select: {
            id: true,
            title: true,
            slug: true,
            category: { select: { slug: true } },
          },
        },
      },
    }),
    prisma.socialPost.count({ where }),
  ]);

  // Platform stats: count by platform for today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const platformStats = await prisma.socialPost.groupBy({
    by: ["platform"],
    _count: { _all: true },
    where: { postedAt: { gte: today }, status: "POSTED" },
  });

  const totalByStatus = await prisma.socialPost.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  return NextResponse.json({
    posts,
    total,
    page,
    platformStats,
    totalByStatus,
  });
}
