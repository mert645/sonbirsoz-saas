import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { parseFeed } from "@/lib/feeds/rss-parser";
import { DEFAULT_RSS_SOURCES } from "@/lib/feeds/source-manager";
import { importSonbirsozArticles } from "@/lib/feeds/sonbirsoz-import-service";
import { isCronAuthorized } from "@/lib/cron-auth";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Ensure RSSSource records exist; seed from defaults on first run
    let sources = await prisma.rSSSource.findMany({ where: { isActive: true } });

    if (sources.length === 0) {
      await prisma.rSSSource.createMany({
        data: DEFAULT_RSS_SOURCES.map((s) => ({
          name: s.name,
          url: s.url,
          category: s.category,
          isActive: true,
        })),
        skipDuplicates: true,
      });
      sources = await prisma.rSSSource.findMany({ where: { isActive: true } });
    }

    let totalNew = 0;
    const errors: { source: string; error: string }[] = [];

    // Fetch each source independently — one failure doesn't block the others
    await Promise.allSettled(
      sources.map(async (source) => {
        try {
          const feed = await parseFeed(source.url);
          let newCount = 0;

          for (const item of feed.items) {
            const externalId = item.guid || item.link;
            if (!externalId) continue;

            const result = await prisma.rSSItem.upsert({
              where: { sourceId_externalId: { sourceId: source.id, externalId } },
              create: {
                sourceId: source.id,
                externalId,
                title: item.title,
                link: item.link,
                description: item.description?.slice(0, 1000) ?? null,
                pubDate: item.pubDate ? new Date(item.pubDate) : null,
                isProcessed: false,
              },
              update: {},
            });

            // upsert returns existing if update: {} was a no-op — check createdAt
            if (result.createdAt > new Date(Date.now() - 5000)) newCount++;
          }

          totalNew += newCount;
          await prisma.rSSSource.update({
            where: { id: source.id },
            data: {
              lastFetched: new Date(),
              fetchCount: { increment: 1 },
            },
          });
        } catch (err) {
          errors.push({
            source: source.name,
            error: err instanceof Error ? err.message : String(err),
          });
          await prisma.rSSSource.update({
            where: { id: source.id },
            data: { errorCount: { increment: 1 } },
          });
        }
      })
    );

    const unprocessedCount = await prisma.rSSItem.count({
      where: { isProcessed: false },
    });

    // sonbirsoz.com'un güncel haberlerini doğrudan PUBLISHED olarak yayımla
    // (RSS + haber-sitemap). Böylece deploy sonrası site otomatik güncel kalır.
    let sonbirsoz: Awaited<
      ReturnType<typeof importSonbirsozArticles>
    > | null = null;
    try {
      sonbirsoz = await importSonbirsozArticles(prisma, { limit: 60 });
      if (sonbirsoz.created > 0 || sonbirsoz.updated > 0) {
        // Yeni içerik geldiyse ana sayfa anında tazelensin.
        revalidatePath("/");
      }
    } catch (err) {
      errors.push({
        source: "sonbirsoz.com",
        error: err instanceof Error ? err.message : String(err),
      });
    }

    return NextResponse.json({
      success: true,
      sourcesChecked: sources.length,
      newItems: totalNew,
      unprocessedTotal: unprocessedCount,
      sonbirsoz: sonbirsoz
        ? {
            created: sonbirsoz.created,
            updated: sonbirsoz.updated,
            skipped: sonbirsoz.skipped,
          }
        : undefined,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("collect-news cron failed:", error);
    return NextResponse.json(
      { error: "collect-news failed", details: String(error) },
      { status: 500 }
    );
  }
}
