import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildRssXml, getRssArticles, RSS_HEADERS, RSS_SITE } from "@/lib/seo/rss";

export const revalidate = 300;

/** Kategori bazlı RSS feed'i: /rss/spor.xml gibi. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ category: string }> }
) {
  const { category: raw } = await params;
  const slug = raw.replace(/\.xml$/, "");

  let categoryName = slug;
  try {
    const category = await prisma.category.findUnique({
      where: { slug },
      select: { name: true },
    });
    if (!category) {
      return NextResponse.json({ error: "Kategori bulunamadı" }, { status: 404 });
    }
    categoryName = category.name;
  } catch {
    // DB erişilemezse slug adıyla devam et
  }

  const articles = await getRssArticles(slug);
  const xml = buildRssXml({
    title: `${RSS_SITE.name} — ${categoryName}`,
    link: `${RSS_SITE.url}/rss/${slug}.xml`,
    description: `Son Bir Söz ${categoryName} kategorisindeki en güncel haberler.`,
    articles,
  });
  return new NextResponse(xml, { headers: RSS_HEADERS });
}
