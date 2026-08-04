import { Metadata } from "next";
import Link from "next/link";
import { Play } from "lucide-react";
import { SITE_URL } from "@/lib/utils/constants";
import { getVideoArticles } from "@/lib/data/articles";
import { formatRelativeTime } from "@/lib/utils/format";

export const metadata: Metadata = {
  title: "Video Haberler — İzle",
  description:
    "Son Bir Söz video haberler: güncel gelişmeleri kısa dikey videolarla izleyin. Gündem, dünya, spor ve yaşamdan video haber akışı.",
  alternates: { canonical: `${SITE_URL}/video` },
  openGraph: {
    title: "Video Haberler | Son Bir Söz",
    description: "Güncel gelişmeleri kısa videolarla izleyin.",
  },
};

export const revalidate = 300;

export default async function VideoPage() {
  const { articles } = await getVideoArticles({ page: 1, limit: 24 });

  return (
    <div className="animate-fade-in mx-auto max-w-7xl px-4 py-8">
      <nav className="mb-8 flex items-center gap-2 text-[13px] text-muted-foreground">
        <Link href="/" className="transition-colors hover:text-foreground">
          Ana Sayfa
        </Link>
        <span>/</span>
        <span className="font-medium text-foreground">Video</span>
      </nav>

      <header className="mb-10">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10 text-red-500">
            <Play className="h-5 w-5" />
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
            Video Haberler
          </h1>
        </div>
        <p className="mt-3 text-[15px] text-muted-foreground">
          Güncel gelişmeleri kısa dikey videolarla izleyin.
        </p>
      </header>

      {articles.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {articles.map((article) => (
            <div
              key={article.id}
              className="group overflow-hidden rounded-xl border border-border bg-card"
            >
              <div className="relative aspect-[9/16] overflow-hidden bg-black">
                <video
                  src={article.videoUrl}
                  poster={article.coverImage ?? undefined}
                  controls
                  preload="none"
                  playsInline
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="p-3">
                <span
                  className="mb-1.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold text-white"
                  style={{ backgroundColor: article.category.color }}
                >
                  {article.category.name}
                </span>
                <Link
                  href={`/${article.category.slug}/${article.slug}`}
                  className="block"
                >
                  <h2 className="line-clamp-2 text-[13px] font-semibold leading-snug transition-colors hover:text-indigo-500">
                    {article.title}
                  </h2>
                </Link>
                <time className="mt-1 block text-[11px] text-muted-foreground">
                  {formatRelativeTime(article.publishedAt ?? new Date())}
                </time>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="py-20 text-center text-muted-foreground">
          Henüz video içerik bulunmuyor. Video haberler admin panelinden
          üretildikçe burada listelenir.
        </p>
      )}
    </div>
  );
}
