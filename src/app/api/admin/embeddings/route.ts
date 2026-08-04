import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireEditor } from "@/lib/data/article-mutations";
import { isEmbeddingConfigured, upsertArticleEmbedding } from "@/lib/ai/embeddings";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * AI arama embedding üretimi (admin):
 * - { articleId } → tek makale için üret/yenile
 * - { backfill: N } → embedding'i olmayan son N yayınlanmış makale için üret
 */
export async function POST(request: NextRequest) {
  const user = await requireEditor();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isEmbeddingConfigured()) {
    return NextResponse.json(
      { error: "Embedding yapılandırılmamış (AWS kimlik bilgileri gerekli)" },
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
    const ok = await upsertArticleEmbedding(body.articleId);
    if (!ok) {
      return NextResponse.json({ error: "Embedding üretilemedi" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  const limit = Math.min(100, Math.max(1, body.backfill ?? 50));
  const articles = await prisma.article.findMany({
    where: { status: "PUBLISHED", embedding: null },
    orderBy: { publishedAt: "desc" },
    take: limit,
    select: { id: true, slug: true },
  });

  const results: { slug: string; ok: boolean }[] = [];
  for (const article of articles) {
    const ok = await upsertArticleEmbedding(article.id);
    results.push({ slug: article.slug, ok });
  }

  return NextResponse.json({
    success: true,
    processed: results.length,
    generated: results.filter((r) => r.ok).length,
    results,
  });
}
