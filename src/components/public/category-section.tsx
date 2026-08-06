import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db";
import { getCurrentTenant } from "@/lib/tenant";

interface Article {
  id: string;
  title: string;
  slug: string;
  spot: string | null;
  coverImage: string | null;
  publishedAt: Date | null;
  viewCount: number;
  category: { name: string; slug: string; color: string } | null;
  author: { name: string } | null;
}

interface CategorySectionProps {
  categorySlug: string;
  categoryName: string;
  categoryColor: string;
  articles: Article[];
}

export function CategorySection({
  categorySlug,
  categoryName,
  categoryColor,
  articles,
}: CategorySectionProps) {
  if (articles.length === 0) return null;

  const mainArticle = articles[0];
  const sideArticles = articles.slice(1, 5);

  const formatDate = (date: Date | null) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
    });
  };

  return (
    <section className="py-10 border-b border-gray-200">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div
              className="w-1 h-8 rounded-full"
              style={{ backgroundColor: categoryColor }}
            />
            <h2 className="text-xl font-bold text-gray-900">{categoryName}</h2>
          </div>
          <Link
            href={`/${categorySlug}`}
            className="text-sm font-medium hover:underline"
            style={{ color: categoryColor }}
          >
            Tümünü Gör →
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Main Article */}
          <Link href={`/${categorySlug}/${mainArticle.slug}`} className="group">
            <div className="relative aspect-[16/10] rounded-xl overflow-hidden mb-4">
              {mainArticle.coverImage ? (
                <Image
                  src={mainArticle.coverImage}
                  alt={mainArticle.title}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300" />
              )}
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-primary transition-colors line-clamp-2">
              {mainArticle.title}
            </h3>
            {mainArticle.spot && (
              <p className="text-gray-600 line-clamp-2 mb-2">{mainArticle.spot}</p>
            )}
            <div className="text-sm text-gray-500">
              {mainArticle.author?.name} • {formatDate(mainArticle.publishedAt)}
            </div>
          </Link>

          {/* Side Articles */}
          <div className="space-y-4">
            {sideArticles.map((article) => (
              <Link
                key={article.id}
                href={`/${categorySlug}/${article.slug}`}
                className="flex gap-4 group"
              >
                <div className="relative w-32 h-20 flex-shrink-0 rounded-lg overflow-hidden">
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
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 line-clamp-2 group-hover:text-primary transition-colors">
                    {article.title}
                  </h4>
                  <div className="text-xs text-gray-500 mt-1">
                    {formatDate(article.publishedAt)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
