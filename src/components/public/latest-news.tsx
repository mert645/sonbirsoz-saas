import Link from "next/link";
import Image from "next/image";
import { Eye, Clock } from "lucide-react";

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

interface LatestNewsProps {
  articles: Article[];
}

export function LatestNews({ articles }: LatestNewsProps) {
  const formatDate = (date: Date | null) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
    });
  };

  const formatViewCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Son Haberler</h2>
          <Link
            href="/haberler"
            className="text-sm font-medium hover:underline"
            style={{ color: "var(--primary-color, #4F46E5)" }}
          >
            Tümünü Gör →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {articles.map((article) => (
            <article key={article.id} className="group">
              <Link href={`/${article.category?.slug}/${article.slug}`}>
                {/* Image */}
                <div className="relative aspect-[16/10] rounded-lg overflow-hidden mb-3">
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
                  
                  {/* Category Badge */}
                  {article.category && (
                    <span
                      className="absolute top-3 left-3 px-2 py-1 text-xs font-semibold text-white rounded"
                      style={{ backgroundColor: article.category.color }}
                    >
                      {article.category.name}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div>
                  <h3 className="font-semibold text-gray-900 line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                    {article.title}
                  </h3>
                  
                  {article.spot && (
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                      {article.spot}
                    </p>
                  )}

                  {/* Meta */}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDate(article.publishedAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      {formatViewCount(article.viewCount)}
                    </span>
                  </div>
                </div>
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
