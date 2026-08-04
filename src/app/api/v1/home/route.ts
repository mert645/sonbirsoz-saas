import {
  getBreakingArticles,
  getFeaturedArticles,
  getLatestArticles,
  getMostViewedArticles,
} from "@/lib/data/articles";
import { toApiArticle, v1Json } from "@/lib/api/v1";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/home — mobil ana ekran için tek istekte tüm bölümler.
 * Flutter uygulaması açılışta yalnızca bu endpoint'i çağırır.
 */
export async function GET() {
  const [featured, breaking, latest, mostViewed] = await Promise.all([
    getFeaturedArticles(5),
    getBreakingArticles(6),
    getLatestArticles(20),
    getMostViewedArticles(10),
  ]);

  return v1Json(
    {
      featured: featured.map(toApiArticle),
      breaking: breaking.map(toApiArticle),
      latest: latest.map(toApiArticle),
      mostViewed: mostViewed.map(toApiArticle),
    },
    { maxAge: 60, staleWhileRevalidate: 300 }
  );
}
