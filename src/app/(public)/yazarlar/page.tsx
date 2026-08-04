import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { PenLine } from "lucide-react";
import { getAllAuthors } from "@/lib/data/authors";
import { SITE_URL } from "@/lib/utils/constants";

export const metadata: Metadata = {
  title: "Yazarlar — Köşe Yazarları ve Haber Merkezi",
  description:
    "Son Bir Söz yazar kadrosu: köşe yazarları, muhabirler ve haber merkezi ekibi. Tüm yazarların haberlerine ve yazılarına buradan ulaşın.",
  alternates: { canonical: `${SITE_URL}/yazarlar` },
  openGraph: {
    title: "Yazarlar | Son Bir Söz",
    description: "Köşe yazarları, muhabirler ve haber merkezi ekibi.",
  },
};

export const revalidate = 3600;

export default async function AuthorsPage() {
  const authors = await getAllAuthors();

  return (
    <div className="animate-fade-in mx-auto max-w-7xl px-4 py-8">
      <nav className="mb-8 flex items-center gap-2 text-[13px] text-muted-foreground">
        <Link href="/" className="transition-colors hover:text-foreground">
          Ana Sayfa
        </Link>
        <span>/</span>
        <span className="font-medium text-foreground">Yazarlar</span>
      </nav>

      <header className="mb-10">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
            <PenLine className="h-5 w-5" />
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
            Yazarlar
          </h1>
        </div>
        <p className="mt-3 text-[15px] text-muted-foreground">
          Köşe yazarları, muhabirler ve haber merkezi ekibi.
        </p>
      </header>

      {authors.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {authors.map((author) => (
            <Link
              key={author.id}
              href={`/yazar/${author.slug}`}
              className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-indigo-500/40"
            >
              <div className="relative h-14 w-14 flex-shrink-0">
                {author.avatar ? (
                  <Image
                    src={author.avatar}
                    alt={author.name}
                    fill
                    className="rounded-full object-cover"
                    sizes="56px"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary/30 to-primary/10 text-xl font-bold text-primary">
                    {author.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-[15px] font-semibold transition-colors group-hover:text-indigo-500">
                  {author.name}
                </h2>
                <p className="mt-0.5 text-[12px] text-muted-foreground">
                  {author.articleCount > 0
                    ? `${author.articleCount} haber`
                    : "Köşe yazarı"}
                </p>
                {author.bio && (
                  <p className="mt-1 line-clamp-1 text-[12px] text-muted-foreground">
                    {author.bio}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="py-20 text-center text-muted-foreground">
          Yazar bilgileri yükleniyor.
        </p>
      )}
    </div>
  );
}
