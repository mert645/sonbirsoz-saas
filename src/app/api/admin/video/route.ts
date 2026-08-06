import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireEditor } from "@/lib/data/article-mutations";
import { requireTenantId } from "@/lib/tenant";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Video işlerini listeler (admin video sayfası). */
export async function GET(request: NextRequest) {
  const user = await requireEditor();
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const tenantId = await requireTenantId();
  const id = request.nextUrl.searchParams.get("id");
  if (id) {
    const job = await prisma.mediaGeneration.findFirst({ where: { id, tenantId } });
    if (!job) return NextResponse.json({ error: "İş bulunamadı" }, { status: 404 });
    return NextResponse.json({ data: job });
  }

  const jobs = await prisma.mediaGeneration.findMany({
    where: { tenantId, purpose: "VIDEO" },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      article: {
        select: { id: true, title: true, slug: true, coverImage: true },
      },
    },
  });
  return NextResponse.json({
    data: jobs,
    configured: false, // Video generation disabled in multi-tenant mode
    youtubeConfigured: false,
  });
}

/**
 * Video pipeline işlemleri - Multi-tenant yapıya geçiş nedeniyle devre dışı.
 */
export async function POST(_request: NextRequest) {
  const user = await requireEditor();
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  return NextResponse.json(
    { error: "Video generation is disabled in multi-tenant mode. Will be re-implemented per tenant." },
    { status: 503 }
  );
}
