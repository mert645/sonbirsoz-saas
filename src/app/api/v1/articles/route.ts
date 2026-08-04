import { NextRequest } from "next/server";
import {
  getArticlesByCategory,
  getLatestArticles,
  searchArticles,
} from "@/lib/data/articles";
import { toApiArticle, v1Json, v1Error } from "@/lib/api/v1";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/articles — sayfalı makale listesi.
 * Parametreler:
 *   ?category=<slug>  kategoriye göre filtre
 *   ?q=<terim>        arama (kategoriyle birleştirilebilir)
 *   ?page=1&limit=20  sayfalama (limit max 50)
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const category = params.get("category")?.trim() || undefined;
  const q = params.get("q")?.trim() || "";
  const page = Math.max(1, parseInt(params.get("page") ?? "1", 10) || 1);
  const limit = Math.min(
    50,
    Math.max(1, parseInt(params.get("limit") ?? "20", 10) || 20)
  );

  if (q) {
    if (q.length < 2) return v1Error("Arama terimi en az 2 karakter olmalı.", 400);
    const results = await searchArticles(q, { categorySlug: category, limit });
    return v1Json(results.map(toApiArticle), {
      meta: { page: 1, limit, total: results.length },
      maxAge: 30,
    });
  }

  if (category) {
    const { articles, total } = await getArticlesByCategory(category, {
      page,
      limit,
    });
    return v1Json(articles.map(toApiArticle), {
      meta: { page, limit, total },
    });
  }

  // Kategorisiz: en yeniler (basit sayfalama olmadan ilk sayfa)
  const latest = await getLatestArticles(limit);
  return v1Json(latest.map(toApiArticle), {
    meta: { page: 1, limit, total: latest.length },
  });
}
