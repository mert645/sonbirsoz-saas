import { NextRequest } from "next/server";
import { getArticleBySlug, incrementViewCount } from "@/lib/data/articles";
import { getSiteUrl, v1Error, v1Json } from "@/lib/api/v1";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/articles/[slug] — makale detayı (mobil okuma ekranı).
 * İçerik sanitize edilmiş HTML olarak döner; istemci webview veya
 * HTML-to-widget dönüştürücüyle işler. audioUrl varsa sesli özet çalınabilir.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return v1Error("Makale bulunamadı.", 404);

  // Görüntülenme sayacı — best-effort
  incrementViewCount(article.id).catch(() => {});

  return v1Json(
    {
      id: article.id,
      title: article.title,
      slug: article.slug,
      spot: article.spot,
      content: article.content,
      coverImage: article.coverImage,
      coverImageAlt: article.coverImageAlt,
      audioUrl: article.audioUrl,
      publishedAt: article.publishedAt
        ? new Date(article.publishedAt).toISOString()
        : null,
      updatedAt: new Date(article.updatedAt).toISOString(),
      readingTime: article.readingTime,
      viewCount: article.viewCount,
      shareCount: article.shareCount,
      category: article.category,
      author: article.author,
      tags: article.tags,
      webUrl: `${getSiteUrl()}/${article.category.slug}/${article.slug}`,
    },
    { maxAge: 300, staleWhileRevalidate: 600 }
  );
}
