import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { SITE_NAME, SITE_URL } from "@/lib/utils/constants";

export async function GET() {
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

  let articles: {
    slug: string;
    title: string;
    publishedAt: Date | null;
    category: { slug: string; name: string };
    tags: { tag: { name: string } }[];
  }[] = [];

  try {
    articles = await prisma.article.findMany({
      where: {
        status: "PUBLISHED",
        publishedAt: { gte: fortyEightHoursAgo },
      },
      orderBy: { publishedAt: "desc" },
      take: 1000,
      select: {
        slug: true,
        title: true,
        publishedAt: true,
        category: { select: { slug: true, name: true } },
        tags: { select: { tag: { select: { name: true } } } },
      },
    });
  } catch {
    // DB unreachable — return empty sitemap rather than error
  }

  const escapeXml = (str: string) =>
    str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${articles
  .map((article) => {
    const keywords = article.tags.map((t) => t.tag.name).join(", ");
    return `  <url>
    <loc>${SITE_URL}/${article.category.slug}/${article.slug}</loc>
    <news:news>
      <news:publication>
        <news:name>${escapeXml(SITE_NAME)}</news:name>
        <news:language>tr</news:language>
      </news:publication>
      <news:publication_date>${article.publishedAt?.toISOString() ?? new Date().toISOString()}</news:publication_date>
      <news:title>${escapeXml(article.title)}</news:title>
      ${keywords ? `<news:keywords>${escapeXml(keywords)}</news:keywords>` : ""}
    </news:news>
  </url>`;
  })
  .join("\n")}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
