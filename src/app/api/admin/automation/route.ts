import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireEditor } from "@/lib/data/article-mutations";

export async function GET() {
  const auth = await requireEditor();
  if (!auth) return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    rssSources,
    rssUnprocessed,
    rssItemsToday,
    lastRSSFetch,
    aiJobsToday,
    aiJobsTotal,
    lastAIJob,
    socialToday,
    socialFailed,
    lastSocialPost,
  ] = await Promise.all([
    prisma.rSSSource.count({ where: { isActive: true } }),
    prisma.rSSItem.count({ where: { isProcessed: false } }),
    prisma.rSSItem.count({ where: { createdAt: { gte: today } } }),
    prisma.rSSSource.findFirst({
      where: { lastFetched: { not: null } },
      orderBy: { lastFetched: "desc" },
      select: { lastFetched: true, name: true },
    }),
    prisma.aIGenerationJob.count({
      where: { createdAt: { gte: today }, status: "COMPLETED" },
    }),
    prisma.aIGenerationJob.count({ where: { status: "COMPLETED" } }),
    prisma.aIGenerationJob.findFirst({
      where: { status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      select: { completedAt: true },
    }),
    prisma.socialPost.count({
      where: { postedAt: { gte: today }, status: "POSTED" },
    }),
    prisma.socialPost.count({ where: { status: "FAILED" } }),
    prisma.socialPost.findFirst({
      where: { status: "POSTED" },
      orderBy: { postedAt: "desc" },
      select: { postedAt: true },
    }),
  ]);

  return NextResponse.json({
    rss: {
      activeSources: rssSources,
      unprocessed: rssUnprocessed,
      collectedToday: rssItemsToday,
      lastRun: lastRSSFetch?.lastFetched ?? null,
      lastSource: lastRSSFetch?.name ?? null,
    },
    ai: {
      generatedToday: aiJobsToday,
      generatedTotal: aiJobsTotal,
      lastRun: lastAIJob?.completedAt ?? null,
    },
    social: {
      postedToday: socialToday,
      failed: socialFailed,
      lastRun: lastSocialPost?.postedAt ?? null,
    },
  });
}
