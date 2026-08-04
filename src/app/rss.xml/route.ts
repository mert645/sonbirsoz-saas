import { NextResponse } from "next/server";
import { buildRssXml, getRssArticles, RSS_HEADERS, RSS_SITE } from "@/lib/seo/rss";

export const revalidate = 300;

/** Ana RSS feed'i — son 50 yayınlanmış haber. */
export async function GET() {
  const articles = await getRssArticles();
  const xml = buildRssXml({
    title: `${RSS_SITE.name} — Son Haberler`,
    link: `${RSS_SITE.url}/rss.xml`,
    description: "Son Bir Söz'den en güncel haberler. Gündem, ekonomi, spor, teknoloji ve daha fazlası.",
    articles,
  });
  return new NextResponse(xml, { headers: RSS_HEADERS });
}
