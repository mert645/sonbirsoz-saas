import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireEditor } from "@/lib/data/article-mutations";
import { requireTenantId } from "@/lib/tenant";
import { generateArticleShort, isVideoConfigured } from "@/lib/video/short-generator";
import {
  uploadYouTubeShort,
  isYouTubeConfigured,
  formatYouTubeContent,
} from "@/lib/social/youtube-client";
import { socialPostUrl } from "@/lib/utils/utm";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Video işlerini listeler (admin video sayfası). */
export async function GET(request: NextRequest) {
  const user = await requireEditor();
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const tenantId = await requireTenantId();
  const id = request.nextUrl.searchParams.get("id");
  if (id) {
    const job = await prisma.mediaGeneration.findFirst({ where: { id, tenantId } });
    if (!job) return NextResponse.json({ error: "İş bulunamadı" }, { status: 404 });
    return NextResponse.json({ data: job });
  }

  await prisma.mediaGeneration
    .updateMany({
      where: {
        tenantId,
        purpose: "VIDEO",
        status: { in: ["PENDING", "PROCESSING"] },
        createdAt: { lt: new Date(Date.now() - 10 * 60 * 1000) },
      },
      data: {
        status: "FAILED",
        error: "Zaman aşımı — işlem tamamlanamadan kesildi",
        completedAt: new Date(),
      },
    })
    .catch(() => {});

  const jobs = await prisma.mediaGeneration.findMany({
    where: { tenantId, purpose: "VIDEO" },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      article: {
        select: { id: true, title: true, slug: true, coverImage: true },
      },
    },
  });
  return NextResponse.json({
    data: jobs,
    configured: isVideoConfigured(),
    youtubeConfigured: isYouTubeConfigured(),
  });
}

/**
 * Video pipeline işlemleri:
 * - { articleId }                → makale için Shorts videosu üret
 * - { jobId, action: "youtube" } → onaylanan videoyu YouTube Shorts'a yükle
 */
export async function POST(request: NextRequest) {
  const user = await requireEditor();
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const tenantId = await requireTenantId();
  let body: { articleId?: string; jobId?: string; action?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  if (body.jobId && body.action === "youtube") {
    if (!isYouTubeConfigured()) {
      return NextResponse.json(
        { error: "YouTube OAuth yapılandırılmamış (YOUTUBE_CLIENT_ID/SECRET/REFRESH_TOKEN)" },
        { status: 503 }
      );
    }
    const job = await prisma.mediaGeneration.findFirst({
      where: { id: body.jobId, tenantId },
      include: {
        article: {
          select: {
            title: true,
            spot: true,
            slug: true,
            category: { select: { slug: true } },
          },
        },
      },
    });
    if (!job?.resultUrl || job.status !== "COMPLETED" || !job.article) {
      return NextResponse.json(
        { error: "Yüklenebilir tamamlanmış video bulunamadı" },
        { status: 400 }
      );
    }

    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.sonbirsoz.com";
      const articleUrl = socialPostUrl(
        `${siteUrl}/${job.article.category.slug}/${job.article.slug}`,
        "youtube"
      );
      const result = await uploadYouTubeShort({
        videoUrl: job.resultUrl,
        title: job.article.title,
        description: formatYouTubeContent(
          job.article.title,
          job.article.spot ?? "",
          articleUrl
        ),
      });
      return NextResponse.json({ success: true, youtube: result });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "YouTube yüklemesi başarısız" },
        { status: 500 }
      );
    }
  }

  if (!body.articleId) {
    return NextResponse.json({ error: "articleId gerekli" }, { status: 400 });
  }

  const article = await prisma.article.findFirst({ where: { id: body.articleId, tenantId } });
  if (!article) {
    return NextResponse.json({ error: "Makale bulunamadı" }, { status: 404 });
  }

  if (!isVideoConfigured()) {
    return NextResponse.json(
      { error: "Video pipeline yapılandırılmamış (ffmpeg + AWS kimlik bilgileri gerekli)" },
      { status: 503 }
    );
  }

  const result = await generateArticleShort(body.articleId);
  if (result.status === "FAILED") {
    return NextResponse.json(
      { error: result.error, jobId: result.jobId },
      { status: 500 }
    );
  }
  return NextResponse.json({
    success: true,
    jobId: result.jobId,
    resultUrl: result.resultUrl,
  });
}
