import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Camera } from "lucide-react";
import { SITE_URL } from "@/lib/utils/constants";
import { getGalleryArticles } from "@/lib/data/articles";
import { formatRelativeTime } from "@/lib/utils/format";

export const metadata: Metadata = {
  title: "Foto Galeri — Haberlerden Kareler",
  description:
    "Son Bir Söz foto galeri: güncel haberlerden en çarpıcı görseller, fotoğraflar ve kareler. Gündem, dünya, spor ve yaşamdan görsel akış.",
  alternates: { canonical: `${SITE_URL}/foto-galeri` },
  openGraph: {
    title: "Foto Galeri | Son Bir Söz",
    description: "Güncel haberlerden en çarpıcı görseller ve kareler.",
  },
};

export const revalidate = 300;

export default async function GalleryPage() {
  const { articles } = await getGalleryArticles({ page: 1, limit: 30 });

  return (
    <div className="animate-fade-in mx-auto max-w-7xl px-4 py-8">
      <nav className="mb-8 flex items-center gap-2 text-[13px] text-muted-foreground">
        <Link href="/" className="transition-colors hover:text-foreground">
          Ana Sayfa
        </Link>
        <span>/</span>
        <span className="font-medium text-foreground">Foto Galeri</span>
      </nav>

      <header className="mb-10">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
            <Camera className="h-5 w-5" />
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
            Foto Galeri
          </h1>
        </div>
        <p className="mt-3 text-[15px] text-muted-foreground">
          Güncel haberlerden en çarpıcı görseller ve kareler.
        </p>
      </header>

      {articles.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {articles.map((article, i) => (
            <Link
              key={article.id}
              href={`/${article.category.slug}/${article.slug}`}
              className="group relative aspect-square overflow-hidden rounded-xl border border-border"
            >
              <Image
                src={article.coverImage!}
                alt={article.title}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 300px"
                priority={i < 4}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-3">
                <span
                  className="mb-1.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold text-white"
                  style={{ backgroundColor: article.category.color }}
                >
                  {article.category.name}
                </span>
                <h2 className="line-clamp-2 text-[13px] font-semibold leading-snug text-white">
                  {article.title}
                </h2>
                <time className="mt-1 block text-[11px] text-white/70">
                  {formatRelativeTime(article.publishedAt ?? new Date())}
                </time>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="py-20 text-center text-muted-foreground">
          Henüz görsel içerik bulunmuyor.
        </p>
      )}
    </div>
  );
}
