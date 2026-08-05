import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireEditor } from "@/lib/data/article-mutations";
import { requireTenantId } from "@/lib/tenant";

/** Moderasyon loglarını listeler (varsayılan: insan kuyruğu — REVIEW). */
export async function GET(req: NextRequest) {
  const auth = await requireEditor();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = await requireTenantId();
  const { searchParams } = new URL(req.url);
  const decision = searchParams.get("decision") || "REVIEW";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = 20;

  const where = {
    tenantId,
    ...(decision === "ALL"
      ? {}
      : { decision: decision as "APPROVED" | "REJECTED" | "REVIEW" }),
  };

  const [total, logs] = await Promise.all([
    prisma.moderationLog.count({ where }),
    prisma.moderationLog.findMany({
      where,
      include: {
        article: {
          select: {
            id: true,
            title: true,
            slug: true,
            spot: true,
            status: true,
            category: { select: { name: true, slug: true } },
          },
        },
        comment: {
          select: { id: true, content: true, status: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return NextResponse.json({ data: logs, total, page, limit });
}
