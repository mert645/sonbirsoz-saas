import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireEditor } from "@/lib/data/article-mutations";

export const dynamic = "force-dynamic";

/** Bülten abone listesi (admin). */
export async function GET(request: NextRequest) {
  const user = await requireEditor();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sp = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(10, parseInt(sp.get("limit") || "50", 10)));
  const filter = sp.get("filter"); // "active" | "inactive" | null

  const where =
    filter === "active"
      ? { isActive: true }
      : filter === "inactive"
        ? { isActive: false }
        : {};

  try {
    const [items, total, activeCount] = await Promise.all([
      prisma.newsletterSubscriber.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          categories: true,
          isActive: true,
          lastSentAt: true,
          createdAt: true,
        },
      }),
      prisma.newsletterSubscriber.count({ where }),
      prisma.newsletterSubscriber.count({ where: { isActive: true } }),
    ]);

    return NextResponse.json({ items, total, activeCount, page, limit });
  } catch (error) {
    console.error("Subscribers list failed:", error);
    return NextResponse.json({ error: "Liste alınamadı" }, { status: 500 });
  }
}
