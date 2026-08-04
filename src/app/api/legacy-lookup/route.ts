import { NextRequest, NextResponse } from "next/server";
import { getCategorySlugForArticle } from "@/lib/data/articles";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Eski sonbirsoz.com kök seviye URL'i (/slug) için hedef yolu döndürür.
 * proxy (middleware) tek-segment yolları stream başlamadan önce buraya sorar
 * ve dönen hedefle 301 yönlendirme yapar.
 *
 * Öncelik: makale (/kategori/slug) → yazar (/yazar/slug) → null.
 * Yanıt: { category: "ekonomi", target: "/ekonomi/slug" } | { category: null, target: "/yazar/slug" } | { category: null, target: null }
 */
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug")?.trim();
  if (!slug) {
    return NextResponse.json({ category: null, target: null }, { status: 400 });
  }

  const headers = {
    // Aynı slug tekrar tekrar sorulmasın (bulunan/bulunamayan ikisi de cache)
    "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
  };

  const category = await getCategorySlugForArticle(slug);
  if (category) {
    return NextResponse.json(
      { category, target: `/${category}/${slug}` },
      { headers }
    );
  }

  // Eski sitede yazar profilleri de kök seviyededir (/yusuf-emre-cimen)
  try {
    const author = await prisma.author.findUnique({
      where: { slug },
      select: { slug: true },
    });
    if (author) {
      return NextResponse.json(
        { category: null, target: `/yazar/${slug}` },
        { headers }
      );
    }
  } catch {
    // DB hatası → yönlendirme yok, normal akış
  }

  return NextResponse.json({ category: null, target: null }, { headers });
}
