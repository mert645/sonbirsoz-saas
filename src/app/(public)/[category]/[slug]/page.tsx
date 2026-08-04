import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { CATEGORIES, SITE_URL, SITE_NAME } from "@/lib/utils/constants";
import { formatDateTime } from "@/lib/utils/format";
import { getArticleBySlug, incrementViewCount } from "@/lib/data/articles";
import { sanitizeArticleHtml } from "@/lib/utils/sanitize";
import { generateNewsArticleJsonLd, generateBreadcrumbJsonLd } from "@/lib/seo/json-ld";
import { ShareButtons } from "@/components/shared/share-buttons";
import { AudioPlayer } from "@/components/shared/audio-player";
import { ArticleAnalytics } from "@/components/analytics/article-analytics";
import { Clock, Eye, Calendar, ArrowLeft } from "lucide-react";

interface ArticlePageProps {
  params: Promise<{ category: string; slug: string }>;
}

export const revalidate = 300;

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { category, slug } = await params;
  const cat = CATEGORIES.find((c) => c.slug === category);
  if (!cat) return {};

  const real = await getArticleBySlug(slug);
  const title =
    real?.seoTitle ||
    real?.title ||
    slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const description =
    real?.seoDescription ||
    real?.spot ||
    `${title} - ${cat.name} haberleri. ${SITE_NAME}'de detaylı bilgi.`;

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/${category}/${slug}` },
    openGraph: {
      title: `${title} | ${SITE_NAME}`,
      description,
      type: "article",
      publishedTime: (real?.publishedAt ?? new Date()).toISOString(),
      authors: [real?.author.name ?? "Son Bir Söz"],
      section: cat.name,
      images: real?.coverImage ? [real.coverImage] : undefined,
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { category, slug } = await params;
  const cat = CATEGORIES.find((c) => c.slug === category);

  if (!cat) notFound();

  const real = await getArticleBySlug(slug);

  if (!real) notFound();

  // Best-effort view counting; does not block render.
  incrementViewCount(real.id);

  const article = {
    title: real.title,
    spot: real.spot ?? "",
    content: real.content,
    coverImage:
      real.coverImage ||
      "https://images.unsplash.com/photo-1495020689067-958852a7765e?w=1200&q=80",
    publishedAt: (real.publishedAt ?? new Date()).toISOString(),
    updatedAt: real.updatedAt.toISOString(),
    readingTime: real.readingTime,
    viewCount: real.viewCount,
    author: {
      name: real.author.name,
      slug: real.author.slug,
      bio: real.author.bio ?? "",
    },
    tags: real.tags.length ? real.tags : [{ name: cat.name, slug: cat.slug }],
  };

  const jsonLd = generateNewsArticleJsonLd({
    title: article.title,
    description: article.spot || "",
    url: `${SITE_URL}/${category}/${slug}`,
    image: article.coverImage || `${SITE_URL}/og-default.png`,
    publishedAt: article.publishedAt,
    updatedAt: article.updatedAt,
    authorName: article.author.name,
    authorUrl: `${SITE_URL}/yazar/${article.author.slug}`,
    categoryName: cat.name,
  });

  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: "Ana Sayfa", url: SITE_URL },
    { name: cat.name, url: `${SITE_URL}/${cat.slug}` },
    { name: article.title, url: `${SITE_URL}/${category}/${slug}` },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <article className="animate-fade-in">
        <ArticleAnalytics articleId={real.id} title={article.title} category={cat.slug} />
        {/* Hero Image */}
        <div className="relative h-[40vh] min-h-[320px] w-full overflow-hidden md:h-[50vh]">
          <Image
            src={article.coverImage}
            alt={article.title}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/60 to-transparent" />
          
          <div className="absolute bottom-0 left-0 right-0">
            <div className="mx-auto max-w-3xl px-4 pb-10">
              {/* Breadcrumb */}
              <nav className="mb-4 flex items-center gap-2 text-[12px] text-zinc-400">
                <Link href="/" className="transition-colors hover:text-white">Ana Sayfa</Link>
                <span className="text-zinc-600">/</span>
                <Link href={`/${cat.slug}`} className="transition-colors hover:text-white">{cat.name}</Link>
              </nav>

              <span
                className="inline-block rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white"
                style={{ backgroundColor: cat.color }}
              >
                {cat.name}
              </span>
              <h1 className="mt-3 text-2xl font-extrabold leading-tight text-white md:text-4xl">
                {article.title}
              </h1>
            </div>
          </div>
        </div>

        {/* Article Body */}
        <div className="mx-auto max-w-3xl px-4">
          {/* Spot */}
          <p className="article-spot mt-8 border-l-4 border-primary pl-4 text-[18px] font-medium leading-relaxed text-foreground/75 md:text-xl">
            {article.spot}
          </p>

          {/* Sesli özet */}
          {real.audioUrl && (
            <AudioPlayer src={real.audioUrl} title={article.title} />
          )}

          {/* Meta Bar */}
          <div className="mt-6 flex flex-wrap items-center gap-4 border-b border-border pb-6 text-[13px] text-muted-foreground">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-red-800 text-xs font-bold text-white">
                {article.author.name.charAt(0)}
              </div>
              <div>
                <Link href={`/yazar/${article.author.slug}`} className="block text-[13px] font-semibold text-foreground hover:text-primary transition-colors">
                  {article.author.name}
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              <time dateTime={article.publishedAt}>
                {formatDateTime(article.publishedAt)}
              </time>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span>{article.readingTime} dk okuma</span>
            </div>
            <div className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              <span>{article.viewCount.toLocaleString("tr-TR")} görüntülenme</span>
            </div>
            <div className="ml-auto">
              <ShareButtons
                url={`${SITE_URL}/${category}/${slug}`}
                title={article.title}
                articleId={real.id}
              />
            </div>
          </div>

          {/* Content */}
          <div
            className={[
              "prose prose-lg mt-10 max-w-none dark:prose-invert",
              "prose-headings:font-extrabold prose-headings:text-foreground prose-headings:leading-tight",
              "prose-h2:mt-12 prose-h2:mb-4 prose-h2:text-[22px] prose-h2:border-b prose-h2:border-border prose-h2:pb-2",
              "prose-h3:mt-8 prose-h3:text-[19px] prose-h3:text-foreground",
              "prose-p:text-[17px] prose-p:leading-[1.95] prose-p:text-foreground/90 prose-p:mb-5",
              "prose-a:text-primary prose-a:font-medium prose-a:no-underline hover:prose-a:underline",
              "prose-strong:text-foreground prose-strong:font-bold",
              "prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:bg-muted/50 prose-blockquote:rounded-r-lg prose-blockquote:py-1 prose-blockquote:text-foreground/80 prose-blockquote:not-italic",
              "prose-ul:text-foreground/90 prose-ol:text-foreground/90 prose-li:mb-1",
              "prose-img:rounded-xl prose-img:shadow-md",
              "prose-hr:border-border",
            ].join(" ")}
            dangerouslySetInnerHTML={{ __html: sanitizeArticleHtml(article.content) }}
          />

          {/* Tags */}
          <div className="mt-10 flex flex-wrap gap-2 border-t border-border pt-6">
            {article.tags.map((tag) => (
              <Link
                key={tag.slug}
                href={`/etiket/${tag.slug}`}
                className="rounded-full border border-border bg-muted/50 px-3.5 py-1.5 text-[12px] font-medium text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
              >
                #{tag.name}
              </Link>
            ))}
          </div>

          {/* Author Box */}
          <div className="mt-10 rounded-xl border border-border bg-muted/30 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-red-800 text-lg font-bold text-white">
                {article.author.name.charAt(0)}
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Yazar</p>
                <Link
                  href={`/yazar/${article.author.slug}`}
                  className="mt-0.5 block text-base font-bold text-foreground hover:text-primary transition-colors"
                >
                  {article.author.name}
                </Link>
                {article.author.bio && (
                  <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                    {article.author.bio}
                  </p>
                )}
                <Link
                  href={`/yazar/${article.author.slug}`}
                  className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                  Tüm yazıları gör <ArrowLeft className="h-3 w-3 rotate-180" />
                </Link>
              </div>
            </div>
          </div>

          {/* Back Link */}
          <div className="my-10">
            <Link
              href={`/${cat.slug}`}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-[13px] font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              {cat.name} haberlerine dön
            </Link>
          </div>
        </div>
      </article>
    </>
  );
}
