import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  postToAllPlatforms,
  type Platform,
  type ArticleForSocial,
} from "@/lib/social/social-orchestrator";
import { isCronAuthorized } from "@/lib/cron-auth";
import { getConfiguredPlatforms } from "@/lib/social/social-publisher";

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Ortak yapılandırma kontrolü (IG = INSTAGRAM_ACCOUNT_ID + FACEBOOK_PAGE_TOKEN)
  const configuredPlatforms: Platform[] = getConfiguredPlatforms();

  if (configuredPlatforms.length === 0) {
    return NextResponse.json({
      success: true,
      message: "No social media platforms configured",
      configuredPlatforms: [],
      processed: 0,
    });
  }

  try {
    // Fetch posts that are due (SCHEDULED and scheduledAt in the past)
    const pendingPosts = await prisma.socialPost.findMany({
      where: {
        status: "SCHEDULED",
        scheduledAt: { lte: new Date() },
        platform: { in: configuredPlatforms.map((p) => p.toUpperCase()) as never[] },
      },
      include: {
        article: {
          select: {
            id: true,
            title: true,
            spot: true,
            slug: true,
            coverImage: true,
            category: { select: { slug: true } },
            tags: { select: { tag: { select: { name: true } } } },
          },
        },
      },
      take: 20,
    });

    if (pendingPosts.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No pending posts to process",
        processed: 0,
        configuredPlatforms,
      });
    }

    let posted = 0;
    let failed = 0;

    for (const post of pendingPosts) {
      const platform = post.platform.toLowerCase() as Platform;
      if (!configuredPlatforms.includes(platform)) continue;

      const articleForSocial: ArticleForSocial = {
        id: post.article.id,
        title: post.article.title,
        spot: post.article.spot ?? "",
        slug: post.article.slug,
        category: post.article.category.slug,
        tags: post.article.tags.map((t: { tag: { name: string } }) => t.tag.name),
        coverImage: post.article.coverImage ?? undefined,
      };

      const results = await postToAllPlatforms(articleForSocial, [platform]);
      const result = results[0];

      if (result?.success) {
        await prisma.socialPost.update({
          where: { id: post.id },
          data: {
            status: "POSTED",
            postedAt: new Date(),
            externalId: result.externalId ?? null,
          },
        });
        posted++;
      } else {
        await prisma.socialPost.update({
          where: { id: post.id },
          data: {
            status: "FAILED",
            error: result?.error ?? "Unknown error",
          },
        });
        failed++;
      }
    }

    return NextResponse.json({
      success: true,
      processed: pendingPosts.length,
      posted,
      failed,
      configuredPlatforms,
    });
  } catch (error) {
    console.error("social-post cron failed:", error);
    return NextResponse.json(
      { error: "social-post cron failed", details: String(error) },
      { status: 500 }
    );
  }
}
