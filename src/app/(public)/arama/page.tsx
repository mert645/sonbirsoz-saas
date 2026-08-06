import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db";
import { getCurrentTenant } from "@/lib/tenant";
import { PublicHeader } from "@/components/public/header";
import { PublicFooter } from "@/components/public/footer";
import { Search, Clock, Eye } from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ q?: string; page?: string }>;
}

const RESULTS_PER_PAGE = 12;

async function searchArticles(tenantId: string, query: string, page: number) {
  if (!query || query.length < 2) {
    return { articles: [], totalCount: 0, totalPages: 0 };
  }

  const [articles, totalCount] = await Promise.all([
    prisma.article.findMany({
      where: {
        tenantId,
        status: "PUBLISHED",
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { spot: { contains: query, mode: "insensitive" } },
          { content: { contains: query, mode: "insensitive" } },
        ],
      },
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * RESULTS_PER_PAGE,
      take: RESULTS_PER_PAGE,
      select: {
        id: true,
        title: true,
        slug: true,
        spot: true,
        coverImage: true,
        publishedAt: true,
        viewCount: true,
        category: { select: { name: true, slug: true, color: true } },
        author: { select: { name: true } },
      },
    }),
    prisma.article.count({
      where: {
        tenantId,
        status: "PUBLISHED",
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { spot: { contains: query, mode: "insensitive" } },
          { content: { contains: query, mode: "insensitive" } },
        ],
      },
    }),
  ]);

  return {
    articles,
    totalCount,
    totalPages: Math.ceil(totalCount / RESULTS_PER_PAGE),
  };
}

async function getCategories(tenantId: string) {
  return prisma.category.findMany({
    where: { tenantId, isActive: true },
    orderBy: { order: "asc" },
    select: { id: true, name: true, slug: true, color: true },
  });
}

export default async function SearchPage({ searchParams }: PageProps) {
  const { q: query, page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam || "1"));

  const tenant = await getCurrentTenant();

  if (!tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Site bulunamadı</p>
      </div>
    );
  }

  const [searchResults, categories] = await Promise.all([
    searchArticles(tenant.id, query || "", page),
    getCategories(tenant.id),
  ]);

  const { articles, totalCount, totalPages } = searchResults;

  const formatDate = (date: Date | null) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicHeader tenant={tenant} categories={categories} />

      <main className="py-8">
        <div className="container mx-auto px-4">
          {/* Search Header */}
          <div className="max-w-2xl mx-auto mb-8">
            <h1 className="text-3xl font-bold text-gray-900 text-center mb-6">
              Haber Ara
            </h1>
            
            <form action="/arama" method="GET" className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  name="q"
                  defaultValue={query}
                  placeholder="Arama yapın..."
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-3 text-white font-medium rounded-xl transition-colors"
                style={{ backgroundColor: "var(--primary-color, #4F46E5)" }}
              >
                Ara
              </button>
            </form>
          </div>

          {/* Results */}
          {query && (
            <div className="mb-6">
              <p className="text-gray-600">
                <span className="font-semibold">&quot;{query}&quot;</span> için{" "}
                <span className="font-semibold">{totalCount}</span> sonuç bulundu
              </p>
            </div>
          )}

          {articles.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                {articles.map((article) => (
                  <article key={article.id} className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <Link href={`/${article.category?.slug}/${article.slug}`}>
                      <div className="relative aspect-[16/10] overflow-hidden">
                        {article.coverImage ? (
                          <Image
                            src={article.coverImage}
                            alt={article.title}
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300" />
                        )}
                        {article.category && (
                          <span
                            className="absolute top-3 left-3 px-2 py-1 text-xs font-semibold text-white rounded"
                            style={{ backgroundColor: article.category.color }}
                          >
                            {article.category.name}
                          </span>
                        )}
                      </div>

                      <div className="p-4">
                        <h2 className="font-semibold text-gray-900 line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                          {article.title}
                        </h2>
                        
                        {article.spot && (
                          <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                            {article.spot}
                          </p>
                        )}

                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {formatDate(article.publishedAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5" />
                            {article.viewCount.toLocaleString("tr-TR")}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </article>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                  {page > 1 && (
                    <Link
                      href={`/arama?q=${encodeURIComponent(query || "")}&page=${page - 1}`}
                      className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      ← Önceki
                    </Link>
                  )}
                  
                  <span className="px-4 py-2 text-gray-600">
                    Sayfa {page} / {totalPages}
                  </span>

                  {page < totalPages && (
                    <Link
                      href={`/arama?q=${encodeURIComponent(query || "")}&page=${page + 1}`}
                      className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Sonraki →
                    </Link>
                  )}
                </div>
              )}
            </>
          ) : query ? (
            <div className="text-center py-20">
              <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-700 mb-2">
                Sonuç bulunamadı
              </h2>
              <p className="text-gray-500">
                &quot;{query}&quot; ile eşleşen haber bulunamadı. Farklı anahtar kelimeler deneyin.
              </p>
            </div>
          ) : (
            <div className="text-center py-20">
              <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-700 mb-2">
                Arama yapın
              </h2>
              <p className="text-gray-500">
                Haberlerde arama yapmak için yukarıdaki kutuyu kullanın.
              </p>
            </div>
          )}
        </div>
      </main>

      <PublicFooter tenant={tenant} />
    </div>
  );
}
