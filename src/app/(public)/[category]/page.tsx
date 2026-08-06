import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db";
import { getCurrentTenant } from "@/lib/tenant";
import { PublicHeader } from "@/components/public/header";
import { PublicFooter } from "@/components/public/footer";
import { Clock, Eye } from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ page?: string }>;
}

const ARTICLES_PER_PAGE = 12;

async function getCategoryData(tenantId: string, categorySlug: string, page: number) {
  const category = await prisma.category.findFirst({
    where: { tenantId, slug: categorySlug, isActive: true },
  });

  if (!category) return null;

  const [articles, totalCount] = await Promise.all([
    prisma.article.findMany({
      where: {
        tenantId,
        categoryId: category.id,
        status: "PUBLISHED",
      },
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * ARTICLES_PER_PAGE,
      take: ARTICLES_PER_PAGE,
      select: {
        id: true,
        title: true,
        slug: true,
        spot: true,
        coverImage: true,
        publishedAt: true,
        viewCount: true,
        author: { select: { name: true } },
      },
    }),
    prisma.article.count({
      where: {
        tenantId,
        categoryId: category.id,
        status: "PUBLISHED",
      },
    }),
  ]);

  return {
    category,
    articles,
    totalCount,
    totalPages: Math.ceil(totalCount / ARTICLES_PER_PAGE),
  };
}

async function getCategories(tenantId: string) {
  return prisma.category.findMany({
    where: { tenantId, isActive: true },
    orderBy: { order: "asc" },
    select: { id: true, name: true, slug: true, color: true },
  });
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { category: categorySlug } = await params;
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam || "1"));

  const tenant = await getCurrentTenant();

  if (!tenant) {
    notFound();
  }

  const [categoryData, categories] = await Promise.all([
    getCategoryData(tenant.id, categorySlug, page),
    getCategories(tenant.id),
  ]);

  if (!categoryData) {
    notFound();
  }

  const { category, articles, totalCount, totalPages } = categoryData;

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
          {/* Category Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-1.5 h-10 rounded-full"
                style={{ backgroundColor: category.color }}
              />
              <h1 className="text-3xl font-bold text-gray-900">{category.name}</h1>
            </div>
            {category.description && (
              <p className="text-gray-600 ml-5">{category.description}</p>
            )}
            <p className="text-sm text-gray-500 ml-5 mt-2">
              {totalCount} haber bulundu
            </p>
          </div>

          {/* Articles Grid */}
          {articles.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                {articles.map((article) => (
                  <article key={article.id} className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <Link href={`/${categorySlug}/${article.slug}`}>
                      {/* Image */}
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
                      </div>

                      {/* Content */}
                      <div className="p-4">
                        <h2 className="font-semibold text-gray-900 line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                          {article.title}
                        </h2>
                        
                        {article.spot && (
                          <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                            {article.spot}
                          </p>
                        )}

                        {/* Meta */}
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
                      href={`/${categorySlug}?page=${page - 1}`}
                      className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      ← Önceki
                    </Link>
                  )}
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                      .map((p, idx, arr) => (
                        <>
                          {idx > 0 && arr[idx - 1] !== p - 1 && (
                            <span key={`ellipsis-${p}`} className="px-2 text-gray-400">...</span>
                          )}
                          <Link
                            key={p}
                            href={`/${categorySlug}?page=${p}`}
                            className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
                              p === page
                                ? "text-white"
                                : "bg-white border border-gray-300 hover:bg-gray-50"
                            }`}
                            style={p === page ? { backgroundColor: category.color } : {}}
                          >
                            {p}
                          </Link>
                        </>
                      ))}
                  </div>

                  {page < totalPages && (
                    <Link
                      href={`/${categorySlug}?page=${page + 1}`}
                      className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Sonraki →
                    </Link>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-20">
              <h2 className="text-xl font-semibold text-gray-700 mb-2">
                Bu kategoride henüz haber yok
              </h2>
              <p className="text-gray-500">
                Yakında yeni haberler eklenecek.
              </p>
            </div>
          )}
        </div>
      </main>

      <PublicFooter tenant={tenant} />
    </div>
  );
}
