import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentTenant } from "@/lib/tenant";
import { PublicHeader } from "@/components/public/header";
import { PublicFooter } from "@/components/public/footer";
import { HeroSection } from "@/components/public/hero-section";
import { CategorySection } from "@/components/public/category-section";
import { LatestNews } from "@/components/public/latest-news";

export const dynamic = "force-dynamic";

async function getHomePageData(tenantId: string) {
  const [featuredArticles, categories, latestArticles] = await Promise.all([
    // Manşet haberler (son 5 öne çıkan)
    prisma.article.findMany({
      where: {
        tenantId,
        status: "PUBLISHED",
      },
      orderBy: { publishedAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        slug: true,
        spot: true,
        coverImage: true,
        publishedAt: true,
        category: { select: { name: true, slug: true, color: true } },
        author: { select: { name: true, slug: true } },
      },
    }),
    // Aktif kategoriler
    prisma.category.findMany({
      where: { tenantId, isActive: true },
      orderBy: { order: "asc" },
      take: 8,
      select: {
        id: true,
        name: true,
        slug: true,
        color: true,
        _count: { select: { articles: true } },
      },
    }),
    // Son haberler
    prisma.article.findMany({
      where: {
        tenantId,
        status: "PUBLISHED",
      },
      orderBy: { publishedAt: "desc" },
      skip: 5,
      take: 12,
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
  ]);

  return { featuredArticles, categories, latestArticles };
}

export default async function PublicHomePage() {
  const tenant = await getCurrentTenant();
  
  if (!tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Site Bulunamadı</h1>
          <p className="text-gray-600">Bu adres için yapılandırılmış bir site yok.</p>
        </div>
      </div>
    );
  }

  const { featuredArticles, categories, latestArticles } = await getHomePageData(tenant.id);

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicHeader tenant={tenant} categories={categories} />
      
      <main>
        {/* Hero / Manşet Bölümü */}
        {featuredArticles.length > 0 && (
          <HeroSection articles={featuredArticles} />
        )}

        {/* Kategoriler */}
        {categories.length > 0 && (
          <section className="py-8 bg-white border-b">
            <div className="container mx-auto px-4">
              <div className="flex flex-wrap gap-3 justify-center">
                {categories.map((category) => (
                  <Link
                    key={category.id}
                    href={`/${category.slug}`}
                    className="px-4 py-2 rounded-full text-sm font-medium transition-colors"
                    style={{ 
                      backgroundColor: `${category.color}15`,
                      color: category.color,
                    }}
                  >
                    {category.name}
                    <span className="ml-1 opacity-60">({category._count.articles})</span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Son Haberler */}
        {latestArticles.length > 0 && (
          <LatestNews articles={latestArticles} />
        )}

        {/* Boş durum */}
        {featuredArticles.length === 0 && latestArticles.length === 0 && (
          <section className="py-20">
            <div className="container mx-auto px-4 text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Henüz Haber Yok
              </h2>
              <p className="text-gray-600">
                Bu sitede henüz yayınlanmış haber bulunmuyor.
              </p>
            </div>
          </section>
        )}
      </main>

      <PublicFooter tenant={tenant} />
    </div>
  );
}
