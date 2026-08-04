import { MetadataRoute } from "next";
import { SITE_URL, CATEGORIES } from "@/lib/utils/constants";
import { prisma } from "@/lib/db";

export const revalidate = 3600; // regenerate every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: "hourly", priority: 1.0 },
    { url: `${SITE_URL}/arama`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/yazarlar`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/video`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },
    { url: `${SITE_URL}/foto-galeri`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },
  ];

  const categoryPages: MetadataRoute.Sitemap = CATEGORIES.map((cat) => ({
    url: `${SITE_URL}/${cat.slug}`,
    lastModified: new Date(),
    changeFrequency: "hourly" as const,
    priority: 0.9,
  }));

  // Real article URLs from DB
  let articlePages: MetadataRoute.Sitemap = [];
  try {
    const articles = await prisma.article.findMany({
      where: { status: "PUBLISHED", publishedAt: { not: null } },
      orderBy: { publishedAt: "desc" },
      take: 5000,
      select: {
        slug: true,
        updatedAt: true,
        publishedAt: true,
        category: { select: { slug: true } },
      },
    });
    articlePages = articles.map((a) => ({
      url: `${SITE_URL}/${a.category.slug}/${a.slug}`,
      lastModified: a.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
  } catch {
    // DB unavailable — skip article entries
  }

  // Author pages
  let authorPages: MetadataRoute.Sitemap = [];
  try {
    const authors = await prisma.author.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
    });
    authorPages = authors.map((a) => ({
      url: `${SITE_URL}/yazar/${a.slug}`,
      lastModified: a.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));
  } catch {
    // skip
  }

  return [...staticPages, ...categoryPages, ...articlePages, ...authorPages];
}
