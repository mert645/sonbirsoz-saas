import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireEditor } from "@/lib/data/article-mutations";

/**
 * Admin-only article listing across all statuses (drafts, review, published).
 */
export async function GET(request: NextRequest) {
  const user = await requireEditor();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const q = searchParams.get("q");

  try {
    const rows = await prisma.article.findMany({
      where: {
        ...(status ? { status: status as never } : {}),
        ...(q
          ? { title: { contains: q, mode: "insensitive" } }
          : {}),
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        publishedAt: true,
        viewCount: true,
        createdAt: true,
        category: { select: { name: true, slug: true } },
        author: { select: { name: true } },
      },
    });

    return NextResponse.json({ data: rows });
  } catch (error) {
    console.error("Admin article list failed:", error);
    return NextResponse.json({ data: [] });
  }
}
