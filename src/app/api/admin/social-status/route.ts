import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireEditor } from "@/lib/data/article-mutations";
import {
  PLATFORM_REQUIREMENTS,
  isPlatformConfigured,
} from "@/lib/social/social-publisher";
import type { Platform } from "@/lib/social/social-orchestrator";

export const dynamic = "force-dynamic";

const PLATFORM_LABELS: Record<Platform, string> = {
  twitter: "X (Twitter)",
  telegram: "Telegram",
  facebook: "Facebook",
  instagram: "Instagram",
  youtube: "YouTube",
};

/**
 * Sosyal hesap bağlantı durumu: hangi platform yapılandırılmış,
 * eksik env anahtarları neler, son gönderi durumu ne.
 */
export async function GET() {
  const user = await requireEditor();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const platforms = Object.keys(PLATFORM_REQUIREMENTS) as Platform[];

  const items = await Promise.all(
    platforms.map(async (platform) => {
      const configured = isPlatformConfigured(platform);
      const missingKeys = PLATFORM_REQUIREMENTS[platform].filter(
        (key) => !process.env[key]
      );

      let lastPost: {
        status: string;
        postedAt: string | null;
        scheduledAt: string | null;
        error: string | null;
        articleTitle: string | null;
      } | null = null;

      try {
        const post = await prisma.socialPost.findFirst({
          where: { platform: platform.toUpperCase() as never },
          orderBy: { createdAt: "desc" },
          select: {
            status: true,
            postedAt: true,
            scheduledAt: true,
            error: true,
            article: { select: { title: true } },
          },
        });
        if (post) {
          lastPost = {
            status: post.status,
            postedAt: post.postedAt?.toISOString() ?? null,
            scheduledAt: post.scheduledAt?.toISOString() ?? null,
            error: post.error,
            articleTitle: post.article?.title ?? null,
          };
        }
      } catch {
        // DB erişilemezse durum bilgisi olmadan devam et
      }

      return {
        platform,
        label: PLATFORM_LABELS[platform],
        configured,
        missingKeys,
        lastPost,
      };
    })
  );

  return NextResponse.json({ items });
}
