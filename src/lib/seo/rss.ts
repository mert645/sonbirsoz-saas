import { prisma } from "@/lib/db";
import { SITE_NAME, SITE_URL } from "@/lib/utils/constants";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

interface RssArticle {
  title: string;
  slug: string;
  spot: string | null;
  coverImage: string | null;
  publishedAt: Date | null;
  category: { name: string; slug: string };
  author: { name: string } | null;
}

export function buildRssXml(options: {
  title: string;
  link: string;
  description: string;
  articles: RssArticle[];
}): string {
  const items = options.articles
    .map((a) => {
      const url = `${SITE_URL}/${a.category.slug}/${a.slug}`;
      const pubDate = (a.publishedAt || new Date()).toUTCString();
      const enclosure = a.coverImage
        ? `\n      <enclosure url="${escapeXml(a.coverImage)}" type="image/jpeg" />`
        : "";
      return `    <item>
      <title>${escapeXml(a.title)}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      <description>${escapeXml(a.spot || a.title)}</description>
      <category>${escapeXml(a.category.name)}</category>
      <pubDate>${pubDate}</pubDate>${enclosure}
      ${a.author ? `<dc:creator>${escapeXml(a.author.name)}</dc:creator>` : ""}
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(options.title)}</title>
    <link>${escapeXml(options.link)}</link>
    <description>${escapeXml(options.description)}</description>
    <language>tr</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${escapeXml(options.link)}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;
}

export async function getRssArticles(categorySlug?: string, tenantId?: string): Promise<RssArticle[]> {
  try {
    const where: Record<string, unknown> = {
      status: "PUBLISHED",
      publishedAt: { not: null },
    };
    if (tenantId) where.tenantId = tenantId;
    if (categorySlug) where.category = { slug: categorySlug };

    return await prisma.article.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      take: 50,
      select: {
        title: true,
        slug: true,
        spot: true,
        coverImage: true,
        publishedAt: true,
        category: { select: { name: true, slug: true } },
        author: { select: { name: true } },
      },
    });
  } catch {
    return [];
  }
}

export const RSS_HEADERS = {
  "Content-Type": "application/rss+xml; charset=utf-8",
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
};

export const RSS_SITE = { name: SITE_NAME, url: SITE_URL };
