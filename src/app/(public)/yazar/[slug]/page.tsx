import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArticleCard } from "@/components/article/article-card";
import { getAuthorBySlug, getArticlesByAuthor } from "@/lib/data/authors";
import { SITE_URL } from "@/lib/utils/constants";

interface AuthorPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: AuthorPageProps): Promise<Metadata> {
  const { slug } = await params;
  const author = await getAuthorBySlug(slug);
  if (!author) {
    return { title: "Yazar Bulunamadı" };
  }
  return {
    title: `${author.name} — Yazar Profili`,
    description:
      author.bio ??
      `${author.name} tarafından yazılan tüm haberler ve köşe yazıları.`,
    alternates: { canonical: `${SITE_URL}/yazar/${slug}` },
    openGraph: {
      title: author.name,
      description: author.bio ?? undefined,
      images: author.avatar ? [{ url: author.avatar }] : [],
    },
  };
}

export default async function AuthorPage({ params }: AuthorPageProps) {
  const { slug } = await params;

  const [author, { articles }] = await Promise.all([
    getAuthorBySlug(slug),
    getArticlesByAuthor(slug, { limit: 12 }),
  ]);

  if (!author) notFound();
  const safeAuthor = author!;

  const socialIcons: Record<string, string> = {
    twitter: "𝕏",
    instagram: "📷",
    facebook: "📘",
    youtube: "▶",
    telegram: "✈",
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Ana Sayfa</Link>
        <span>/</span>
        <span className="text-foreground">Yazarlar</span>
        <span>/</span>
        <span className="text-foreground">{safeAuthor.name}</span>
      </nav>

      {/* Author Profile */}
      <div className="flex flex-col items-center gap-6 rounded-xl border border-border bg-card p-8 text-center md:flex-row md:text-left">
        <div className="relative h-24 w-24 flex-shrink-0">
          {safeAuthor.avatar ? (
            <Image
              src={safeAuthor.avatar}
              alt={safeAuthor.name}
              fill
              className="rounded-full object-cover"
              sizes="96px"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary/30 to-primary/10 text-3xl font-bold text-primary">
              {safeAuthor.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div className="flex-1">
          <h1 className="text-2xl font-bold">{safeAuthor.name}</h1>

          {safeAuthor.bio && (
            <p className="mt-2 text-muted-foreground">{safeAuthor.bio}</p>
          )}

          {safeAuthor.expertise.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 md:justify-start">
              {safeAuthor.expertise.map((exp) => (
                <span
                  key={exp}
                  className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                >
                  {exp}
                </span>
              ))}
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-center gap-4 md:justify-start">
            <p className="text-sm text-muted-foreground">
              {safeAuthor.articleCount} haber yayınladı
            </p>

            {safeAuthor.socialLinks &&
              Object.entries(safeAuthor.socialLinks).map(([platform, url]) => (
                <a
                  key={platform}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-foreground"
                  title={platform}
                >
                  {socialIcons[platform] ?? platform}
                </a>
              ))}
          </div>
        </div>
      </div>

      {/* Author's Articles */}
      <section className="mt-8">
        <h2 className="mb-6 text-lg font-bold">
          {safeAuthor.name} Haberleri
          {articles.length > 0 && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({safeAuthor.articleCount})
            </span>
          )}
        </h2>

        {articles.length === 0 ? (
          <p className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
            Henüz yayınlanmış haber bulunmuyor.
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <ArticleCard
                key={article.id}
                title={article.title}
                slug={article.slug}
                spot={article.spot}
                coverImage={article.coverImage}
                publishedAt={article.publishedAt?.toISOString() ?? new Date().toISOString()}
                readingTime={article.readingTime}
                category={article.category}
                author={article.author}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
