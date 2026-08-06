import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db";
import { getCurrentTenant } from "@/lib/tenant";
import { PublicHeader } from "@/components/public/header";
import { PublicFooter } from "@/components/public/footer";
import { Clock, Eye, Share2 } from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ category: string; slug: string }>;
}

async function getArticle(tenantId: string, slug: string) {
  const article = await prisma.article.findFirst({
    where: {
      tenantId,
      slug,
      status: "PUBLISHED",
    },
    include: {
      category: true,
      author: true,
      tags: {
        include: { tag: true },
      },
    },
  });

  if (article) {
    // View count artır
    await prisma.article.update({
      where: { id: article.id },
      data: { viewCount: { increment: 1 } },
    });
  }

  return article;
}

async function getRelatedArticles(tenantId: string, categoryId: string, excludeId: string) {
  return prisma.article.findMany({
    where: {
      tenantId,
      categoryId,
      status: "PUBLISHED",
      id: { not: excludeId },
    },
    orderBy: { publishedAt: "desc" },
    take: 4,
    select: {
      id: true,
      title: true,
      slug: true,
      coverImage: true,
      publishedAt: true,
      category: { select: { slug: true } },
    },
  });
}

async function getCategories(tenantId: string) {
  return prisma.category.findMany({
    where: { tenantId, isActive: true },
    orderBy: { order: "asc" },
    select: { id: true, name: true, slug: true, color: true },
  });
}

export default async function ArticlePage({ params }: PageProps) {
  const { category: categorySlug, slug } = await params;
  const tenant = await getCurrentTenant();

  if (!tenant) {
    notFound();
  }

  const [article, categories] = await Promise.all([
    getArticle(tenant.id, slug),
    getCategories(tenant.id),
  ]);

  if (!article) {
    notFound();
  }

  const relatedArticles = await getRelatedArticles(tenant.id, article.categoryId, article.id);

  const formatDate = (date: Date | null) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const shareUrl = typeof window !== "undefined" 
    ? window.location.href 
    : `https://${tenant.slug}.sonbirsoz-saas.com/${categorySlug}/${slug}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicHeader tenant={tenant} categories={categories} />

      <main className="py-8">
        <article className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
              <Link href="/" className="hover:text-gray-700">Ana Sayfa</Link>
              <span>/</span>
              <Link 
                href={`/${article.category?.slug}`} 
                className="hover:text-gray-700"
                style={{ color: article.category?.color }}
              >
                {article.category?.name}
              </Link>
            </nav>

            {/* Category Badge */}
            {article.category && (
              <Link
                href={`/${article.category.slug}`}
                className="inline-block px-3 py-1 text-sm font-semibold text-white rounded-full mb-4"
                style={{ backgroundColor: article.category.color }}
              >
                {article.category.name}
              </Link>
            )}

            {/* Title */}
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {article.title}
            </h1>

            {/* Spot */}
            {article.spot && (
              <p className="text-xl text-gray-600 mb-6 leading-relaxed">
                {article.spot}
              </p>
            )}

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-6 pb-6 border-b">
              {article.author && (
                <Link 
                  href={`/yazar/${article.author.slug}`}
                  className="font-medium text-gray-700 hover:underline"
                >
                  {article.author.name}
                </Link>
              )}
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {formatDate(article.publishedAt)}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                {article.viewCount.toLocaleString("tr-TR")} görüntülenme
              </span>
              {article.readingTime && (
                <span>{article.readingTime} dk okuma</span>
              )}
            </div>

            {/* Cover Image */}
            {article.coverImage && (
              <div className="relative aspect-[16/9] rounded-xl overflow-hidden mb-8">
                <Image
                  src={article.coverImage}
                  alt={article.title}
                  fill
                  className="object-cover"
                  priority
                />
                {article.coverImageAlt && (
                  <p className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-sm px-4 py-2">
                    {article.coverImageAlt}
                  </p>
                )}
              </div>
            )}

            {/* Content */}
            <div 
              className="prose prose-lg max-w-none mb-8"
              dangerouslySetInnerHTML={{ __html: article.content }}
            />

            {/* Tags */}
            {article.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-8">
                {article.tags.map(({ tag }) => (
                  <Link
                    key={tag.id}
                    href={`/etiket/${tag.slug}`}
                    className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full hover:bg-gray-200 transition-colors"
                  >
                    #{tag.name}
                  </Link>
                ))}
              </div>
            )}

            {/* Share */}
            <div className="flex items-center gap-4 py-6 border-t border-b mb-8">
              <span className="flex items-center gap-2 text-gray-700 font-medium">
                <Share2 className="w-5 h-5" />
                Paylaş:
              </span>
              <div className="flex gap-2">
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors"
                  aria-label="Facebook'ta paylaş"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                <a
                  href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(article.title)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors"
                  aria-label="X'te paylaş"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
                <a
                  href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(article.title)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-blue-700 text-white rounded-full flex items-center justify-center hover:bg-blue-800 transition-colors"
                  aria-label="LinkedIn'de paylaş"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
              </div>
            </div>

            {/* Author Box */}
            {article.author && (
              <div className="bg-gray-100 rounded-xl p-6 mb-8">
                <div className="flex items-start gap-4">
                  {article.author.avatar ? (
                    <Image
                      src={article.author.avatar}
                      alt={article.author.name}
                      width={64}
                      height={64}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center text-2xl font-bold text-gray-600">
                      {article.author.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <Link 
                      href={`/yazar/${article.author.slug}`}
                      className="font-bold text-lg text-gray-900 hover:underline"
                    >
                      {article.author.name}
                    </Link>
                    {article.author.bio && (
                      <p className="text-gray-600 mt-1">{article.author.bio}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Related Articles */}
          {relatedArticles.length > 0 && (
            <div className="max-w-6xl mx-auto mt-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">İlgili Haberler</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {relatedArticles.map((related) => (
                  <Link
                    key={related.id}
                    href={`/${related.category?.slug}/${related.slug}`}
                    className="group"
                  >
                    <div className="relative aspect-[16/10] rounded-lg overflow-hidden mb-3">
                      {related.coverImage ? (
                        <Image
                          src={related.coverImage}
                          alt={related.title}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300" />
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900 line-clamp-2 group-hover:text-primary transition-colors">
                      {related.title}
                    </h3>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </article>
      </main>

      <PublicFooter tenant={tenant} />
    </div>
  );
}
