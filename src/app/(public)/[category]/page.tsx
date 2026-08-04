import { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Clock } from "lucide-react";
import { CATEGORIES, SITE_URL } from "@/lib/utils/constants";
import {
  getArticlesByCategory,
  getCategorySlugForArticle,
} from "@/lib/data/articles";
import { formatRelativeTime } from "@/lib/utils/format";

interface CategoryPageProps {
  params: Promise<{ category: string }>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { category } = await params;
  const cat = CATEGORIES.find((c) => c.slug === category);
  if (!cat) return {};

  return {
    title: `${cat.name} Haberleri`,
    description: `${cat.name} kategorisindeki en güncel haberler. Son dakika ${cat.name.toLowerCase()} haberleri Son Bir Söz'de.`,
    alternates: { canonical: `${SITE_URL}/${cat.slug}` },
    openGraph: {
      title: `${cat.name} Haberleri | Son Bir Söz`,
      description: `${cat.name} kategorisindeki en güncel haberler.`,
    },
  };
}

export function generateStaticParams() {
  return CATEGORIES.map((cat) => ({ category: cat.slug }));
}

// Bilinen kategoriler generateStaticParams ile ISR'lenir; bilinmeyen tek-segment
// yollar (eski sonbirsoz.com haber linkleri) dinamik render edilip yönlendirilir.
export const dynamicParams = true;
export const revalidate = 300;

const STOCK_IMAGES = [
  "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&q=80",
  "https://images.unsplash.com/photo-1495020689067-958852a7765e?w=600&q=80",
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&q=80",
  "https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=600&q=80",
  "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&q=80",
  "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&q=80",
  "https://images.unsplash.com/photo-1589994965851-a8f479c573a9?w=600&q=80",
  "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&q=80",
  "https://images.unsplash.com/photo-1542296332-2e4473faf563?w=600&q=80",
];

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category } = await params;
  const cat = CATEGORIES.find((c) => c.slug === category);

  if (!cat) {
    // Eski sonbirsoz.com kök seviye URL'i olabilir (/haber-slug).
    // Makale bulunursa yeni /kategori/haber-slug adresine kalıcı yönlendir.
    // Not: Asıl 301 yönlendirme proxy'de (stream öncesi) yapılır; bu, doğrudan
    // erişim veya proxy atlanırsa güvenlik ağıdır.
    const articleCategory = await getCategorySlugForArticle(category);
    if (articleCategory) {
      permanentRedirect(`/${articleCategory}/${category}`);
    }
    notFound();
  }

  const { articles: realArticles } = await getArticlesByCategory(category, {
    page: 1,
    limit: 12,
  });

  const articles = realArticles.map((a, i) => ({
    id: a.id,
    title: a.title,
    slug: a.slug,
    spot: a.spot ?? "",
    coverImage: a.coverImage ?? STOCK_IMAGES[i % STOCK_IMAGES.length],
    publishedAt: (a.publishedAt ?? new Date()).toISOString(),
    readingTime: a.readingTime,
  }));

  return (
    <div className="animate-fade-in mx-auto max-w-7xl px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-8 flex items-center gap-2 text-[13px] text-muted-foreground">
        <Link href="/" className="transition-colors hover:text-foreground">
          Ana Sayfa
        </Link>
        <span>/</span>
        <span className="font-medium text-foreground">{cat.name}</span>
      </nav>

      {/* Category Header */}
      <header className="mb-10">
        <div className="flex items-center gap-3">
          <span
            className="h-8 w-1.5 rounded-full"
            style={{ backgroundColor: cat.color }}
          />
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
            {cat.name}
          </h1>
        </div>
        <p className="mt-3 text-[15px] text-muted-foreground">
          {cat.name} kategorisindeki en güncel haberler ve son dakika gelişmeleri.
        </p>
      </header>

      {/* Articles Grid */}
      {articles.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article, i) => (
            <Link
              key={article.id}
              href={`/${category}/${article.slug}`}
              className="group overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-border hover:shadow-md"
            >
              <div className="relative aspect-[16/10] overflow-hidden">
                <Image
                  src={article.coverImage}
                  alt={article.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, (max-width: 1280px) 33vw, 400px"
                  priority={i < 3}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <div className="p-4">
                <span
                  className="inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
                  style={{ backgroundColor: cat.color }}
                >
                  {cat.name}
                </span>
                <h3 className="mt-2 line-clamp-2 text-[15px] font-bold leading-snug text-foreground group-hover:text-primary transition-colors">
                  {article.title}
                </h3>
                <p className="mt-2 line-clamp-2 text-[13px] text-muted-foreground">
                  {article.spot}
                </p>
                <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{article.readingTime} dk okuma</span>
                  <span>·</span>
                  <span>{formatRelativeTime(article.publishedAt)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border py-20 text-center">
          <p className="text-[15px] font-medium text-foreground">
            Bu kategoride henüz yayımlanmış haber bulunmuyor.
          </p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Kısa süre içinde yeni içerikler eklenecek.
          </p>
        </div>
      )}
    </div>
  );
}
