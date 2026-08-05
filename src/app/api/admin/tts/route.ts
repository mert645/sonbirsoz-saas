import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireEditor } from "@/lib/data/article-mutations";
import { requireTenantId } from "@/lib/tenant";
import { generateArticleAudio, isTtsConfigured } from "@/lib/tts/polly";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Sesli özet üretimi (admin):
 * - { articleId } → tek makale için üret/yenile
 * - { backfill: N } → audioUrl'i olmayan son N yayınlanmış makale için üret
 */
export async function POST(request: NextRequest) {
  const user = await requireEditor();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await requireTenantId();

  if (!isTtsConfigured()) {
    return NextResponse.json(
      { error: "TTS yapılandırılmamış (AWS kimlik bilgileri gerekli)" },
      { status: 503 }
    );
  }

  let body: { articleId?: string; backfill?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  if (body.articleId) {
    const article = await prisma.article.findFirst({ where: { id: body.articleId, tenantId } });
    if (!article) {
      return NextResponse.json({ error: "Makale bulunamadı" }, { status: 404 });
    }
    const url = await generateArticleAudio(body.articleId);
    if (!url) {
      return NextResponse.json({ error: "Ses üretilemedi" }, { status: 500 });
    }
    return NextResponse.json({ success: true, audioUrl: url });
  }

  const limit = Math.min(20, Math.max(1, body.backfill ?? 10));
  const articles = await prisma.article.findMany({
    where: { tenantId, status: "PUBLISHED", audioUrl: null },
    orderBy: { publishedAt: "desc" },
    take: limit,
    select: { id: true, slug: true },
  });

  const results: { slug: string; ok: boolean }[] = [];
  for (const article of articles) {
    const url = await generateArticleAudio(article.id);
    results.push({ slug: article.slug, ok: !!url });
  }

  return NextResponse.json({
    success: true,
    processed: results.length,
    generated: results.filter((r) => r.ok).length,
    results,
  });
}
