import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateArticleFromSources, type NewsSource } from "@/lib/ai/news-generator";
import { makeSlug, setArticleStatus } from "@/lib/data/article-mutations";
import { calculateReadingTime } from "@/lib/utils/format";
import { isCronAuthorized } from "@/lib/cron-auth";
import { moderateAndLog, attachModerationLog } from "@/lib/ai/moderation";

// Gateway (CloudFront) 30sn'de kesiyor; tek grup üretmek senkron yanıtı
// bu sınırın altında tutar. Cron zaten periyodik çalışır, birikmiş öğeler
// sonraki turlarda işlenir.
const MAX_GROUPS = 1;
const MAX_ITEMS_PER_GROUP = 5;

// AI üretimi (Bedrock çağrıları) uzun sürebilir; SSR Lambda default 30sn'yi aşar.
export const maxDuration = 300;

// Returns a unique slug, appending -N if taken
async function uniqueSlug(base: string): Promise<string> {
  let slug = base;
  let n = 1;
  while (await prisma.article.findUnique({ where: { slug } })) {
    slug = `${base}-${n++}`;
  }
  return slug;
}

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.CUSTOM_AWS_ACCESS_KEY_ID && !process.env.AWS_ACCESS_KEY_ID) {
    return NextResponse.json({
      success: true,
      message: "Skipped — AWS credentials not configured",
    });
  }

  try {
    // Fetch unprocessed items with their source (for category info)
    const rawItems = await prisma.rSSItem.findMany({
      where: { isProcessed: false },
      orderBy: { pubDate: "desc" },
      take: MAX_GROUPS * MAX_ITEMS_PER_GROUP * 4,
      include: { source: { select: { category: true, name: true } } },
    });

    if (rawItems.length === 0) {
      return NextResponse.json({ success: true, message: "No unprocessed items", generated: 0 });
    }

    // Group items by category (use source.category or "gundem" as fallback)
    const grouped: Record<string, typeof rawItems> = {};
    for (const item of rawItems) {
      const cat = item.source.category ?? "gundem";
      if (!grouped[cat]) grouped[cat] = [];
      if (grouped[cat].length < MAX_ITEMS_PER_GROUP) grouped[cat].push(item);
    }

    const categoryGroups = Object.entries(grouped).slice(0, MAX_GROUPS);

    // Get/create a default "AI" author for generated articles
    let aiAuthor = await prisma.author.findFirst({
      where: { slug: "ai-redaksiyon" },
    });
    if (!aiAuthor) {
      aiAuthor = await prisma.author.create({
        data: {
          name: "AI Redaksiyon",
          slug: "ai-redaksiyon",
          bio: "Yapay zeka destekli haber redaksiyonu.",
          expertise: ["AI", "Otomasyon"],
          isActive: false,
        },
      });
    }

    // Get or create a system user for AI-generated articles
    let aiUser = await prisma.user.findFirst({
      where: { email: "ai@system.local" },
    });
    if (!aiUser) {
      aiUser = await prisma.user.create({
        data: {
          email: "ai@system.local",
          name: "AI Sistem",
          role: "AUTHOR",
          passwordHash: null,
        },
      });
    }

    let generated = 0;
    const results: { category: string; title: string; slug: string }[] = [];

    for (const [categorySlug, items] of categoryGroups) {
      const jobStartedAt = new Date();
      let jobRecord = await prisma.aIGenerationJob.create({
        data: {
          type: "article",
          status: "PROCESSING",
          startedAt: jobStartedAt,
          input: {
            categorySlug,
            sourceCount: items.length,
            itemIds: items.map((i) => i.id),
          },
        },
      });

      try {
        const sources: NewsSource[] = items.map((item) => ({
          title: item.title,
          description: item.description ?? "",
          link: item.link,
          pubDate: item.pubDate?.toISOString(),
          source: item.source.name,
        }));

        const generated_article = await generateArticleFromSources(sources);

        // ── AI ön-moderasyon (hibrit): temiz → otomatik yayın,
        //    ihlal → REJECTED, gri bölge → REVIEW (insan kuyruğu)
        const moderation = await moderateAndLog({
          title: generated_article.title,
          text: generated_article.content,
          contentType: "article",
          source: "ai-generate",
        });

        // Resolve or create category
        let category = await prisma.category.findUnique({
          where: { slug: categorySlug },
        });
        if (!category) {
          category = await prisma.category.create({
            data: {
              name: categorySlug.charAt(0).toUpperCase() + categorySlug.slice(1),
              slug: categorySlug,
              color: "#6b7280",
              order: 99,
            },
          });
        }

        const slug = await uniqueSlug(makeSlug(generated_article.title));
        const readingTime = calculateReadingTime(generated_article.content);

        // Moderasyon kararına göre başlangıç durumu
        const initialStatus =
          moderation.decision === "REJECTED"
            ? ("REJECTED" as const)
            : ("REVIEW" as const);

        const article = await prisma.article.create({
          data: {
            title: generated_article.title,
            slug,
            spot: generated_article.spot,
            content: generated_article.content,
            seoTitle: generated_article.seoTitle,
            seoDescription: generated_article.seoDescription,
            status: initialStatus,
            rejectionNote:
              moderation.decision === "REJECTED"
                ? `AI moderasyon: ${moderation.maxCategory} (${moderation.maxScore.toFixed(2)}) — ${moderation.reason}`
                : null,
            readingTime,
            isAIGenerated: true,
            categoryId: category.id,
            authorId: aiAuthor!.id,
            userId: aiUser!.id,
          },
        });

        // Moderasyon logunu makaleye bağla
        if (moderation.logId) {
          await attachModerationLog(moderation.logId, { articleId: article.id });
        }

        // Temiz içerik → otomatik yayın (revalidate + sosyal + push side-effect'leri
        // setArticleStatus içinde tetiklenir)
        if (moderation.decision === "APPROVED") {
          await setArticleStatus(article.id, "PUBLISHED", {
            userId: aiUser!.id,
            note: `AI moderasyon otomatik onayı (max skor: ${moderation.maxScore.toFixed(2)})`,
          });
        }

        // Save tags
        if (generated_article.tags.length > 0) {
          for (const tagName of generated_article.tags.slice(0, 6)) {
            const tagSlug = makeSlug(tagName);
            const tag = await prisma.tag.upsert({
              where: { slug: tagSlug },
              create: { name: tagName, slug: tagSlug },
              update: {},
            });
            await prisma.articleTag.upsert({
              where: { articleId_tagId: { articleId: article.id, tagId: tag.id } },
              create: { articleId: article.id, tagId: tag.id },
              update: {},
            });
          }
        }

        // Update job record
        jobRecord = await prisma.aIGenerationJob.update({
          where: { id: jobRecord.id },
          data: {
            articleId: article.id,
            status: "COMPLETED",
            completedAt: new Date(),
            output: {
              articleId: article.id,
              title: article.title,
              slug: article.slug,
              wordCount: generated_article.content.split(/\s+/).length,
              moderation: {
                decision: moderation.decision,
                maxCategory: moderation.maxCategory,
                maxScore: moderation.maxScore,
              },
            },
          },
        });

        // Mark source items as processed
        await prisma.rSSItem.updateMany({
          where: { id: { in: items.map((i) => i.id) } },
          data: { isProcessed: true },
        });

        generated++;
        results.push({ category: categorySlug, title: article.title, slug: article.slug });
      } catch (err) {
        await prisma.aIGenerationJob.update({
          where: { id: jobRecord.id },
          data: {
            status: "FAILED",
            completedAt: new Date(),
            error: err instanceof Error ? err.message : String(err),
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      generated,
      articles: results,
    });
  } catch (error) {
    console.error("generate-articles cron failed:", error);
    return NextResponse.json(
      { error: "generate-articles failed", details: String(error) },
      { status: 500 }
    );
  }
}
