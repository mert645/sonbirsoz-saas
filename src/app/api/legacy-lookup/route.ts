import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentTenantId } from "@/lib/tenant";

export const dynamic = "force-dynamic";

/**
 * Eski sonbirsoz.com kök seviye URL'i (/slug) için hedef yolu döndürür.
 * Multi-tenant: Sadece mevcut tenant'ın içeriklerini arar.
 */
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug")?.trim();
  if (!slug) {
    return NextResponse.json({ category: null, target: null }, { status: 400 });
  }

  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    return NextResponse.json({ category: null, target: null });
  }

  const headers = {
    "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
  };

  // Makale ara
  const article = await prisma.article.findFirst({
    where: { tenantId, slug, status: "PUBLISHED" },
    select: { category: { select: { slug: true } } },
  });

  if (article?.category) {
    return NextResponse.json(
      { category: article.category.slug, target: `/${article.category.slug}/${slug}` },
      { headers }
    );
  }

  // Yazar ara
  try {
    const author = await prisma.author.findFirst({
      where: { tenantId, slug },
      select: { slug: true },
    });
    if (author) {
      return NextResponse.json(
        { category: null, target: `/yazar/${slug}` },
        { headers }
      );
    }
  } catch {
    // DB hatası → yönlendirme yok
  }

  return NextResponse.json({ category: null, target: null }, { headers });
}
