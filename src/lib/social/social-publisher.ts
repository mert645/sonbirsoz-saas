import { prisma } from "@/lib/db";
import {
  postToAllPlatforms,
  getPostingSchedule,
  type Platform,
  type ArticleForSocial,
} from "./social-orchestrator";

/**
 * Platform yapılandırma kontrolü — tek doğruluk kaynağı.
 * NOT: Instagram, Graph API üzerinden IG Business hesabıyla çalışır;
 * INSTAGRAM_ACCOUNT_ID + FACEBOOK_PAGE_TOKEN birlikte gerekir
 * (eski INSTAGRAM_ACCESS_TOKEN kontrolü yanlıştı).
 */
export const PLATFORM_REQUIREMENTS: Record<Platform, string[]> = {
  twitter: ["TWITTER_API_KEY", "TWITTER_API_SECRET", "TWITTER_ACCESS_TOKEN", "TWITTER_ACCESS_SECRET"],
  telegram: ["TELEGRAM_BOT_TOKEN", "TELEGRAM_CHANNEL_ID"],
  facebook: ["FACEBOOK_PAGE_TOKEN", "FACEBOOK_PAGE_ID"],
  instagram: ["INSTAGRAM_ACCOUNT_ID", "FACEBOOK_PAGE_TOKEN"],
  youtube: ["YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET", "YOUTUBE_REFRESH_TOKEN"],
};

export function isPlatformConfigured(platform: Platform): boolean {
  return PLATFORM_REQUIREMENTS[platform].every((key) => !!process.env[key]);
}

export function getConfiguredPlatforms(): Platform[] {
  return (Object.keys(PLATFORM_REQUIREMENTS) as Platform[]).filter(isPlatformConfigured);
}

/** Platform adını Prisma enum değerine çevirir (TWITTER, TELEGRAM, ...). */
function toEnumValue(platform: Platform) {
  return platform.toUpperCase() as "TWITTER" | "TELEGRAM" | "FACEBOOK" | "INSTAGRAM" | "YOUTUBE";
}

export interface PublishSocialResult {
  immediate: { platform: Platform; success: boolean; error?: string }[];
  scheduled: Platform[];
}

/**
 * Yayınlanan makaleyi sosyal medyaya GERÇEK ZAMANLI gönderir.
 *
 * - Gecikmesiz platformlar (X, Telegram) anında paylaşılır.
 * - Kademeli platformlar (FB +5dk, IG +15dk, YT +30dk) SocialPost kaydıyla
 *   zamanlanır; 5 dk'lık cron yedek/zamanlayıcı olarak devralır.
 * - Hata hiçbir zaman yayınlamayı bloklamaz; sonuçlar SocialPost'a yazılır.
 */
export async function publishArticleToSocial(articleId: string): Promise<PublishSocialResult> {
  const result: PublishSocialResult = { immediate: [], scheduled: [] };

  const platforms = getConfiguredPlatforms();
  if (platforms.length === 0) return result;

  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: {
      id: true,
      title: true,
      spot: true,
      slug: true,
      coverImage: true,
      category: { select: { slug: true } },
      tags: { select: { tag: { select: { name: true } } } },
    },
  });
  if (!article) return result;

  const articleForSocial: ArticleForSocial = {
    id: article.id,
    title: article.title,
    spot: article.spot ?? "",
    slug: article.slug,
    category: article.category.slug,
    tags: article.tags.map((t) => t.tag.name),
    coverImage: article.coverImage ?? undefined,
  };

  const schedule = getPostingSchedule(platforms);
  const now = Date.now();

  for (const { platform, delayMs } of schedule) {
    const scheduledAt = new Date(now + delayMs);

    // Aynı makale+platform için mükerrer kayıt oluşturma
    const existing = await prisma.socialPost.findFirst({
      where: { articleId, platform: toEnumValue(platform) },
      select: { id: true, status: true },
    });

    if (delayMs === 0) {
      // Anında gönder
      const [postResult] = await postToAllPlatforms(articleForSocial, [platform]);
      const success = !!postResult?.success;
      const data = {
        status: success ? ("POSTED" as const) : ("FAILED" as const),
        postedAt: success ? new Date() : null,
        externalId: postResult?.externalId ?? null,
        error: success ? null : (postResult?.error ?? "Unknown error"),
      };
      if (existing) {
        if (existing.status !== "POSTED") {
          await prisma.socialPost.update({ where: { id: existing.id }, data });
        }
      } else {
        await prisma.socialPost.create({
          data: { articleId, platform: toEnumValue(platform), scheduledAt, ...data },
        });
      }
      result.immediate.push({
        platform,
        success,
        error: success ? undefined : postResult?.error,
      });
    } else {
      // Kademeli platform: cron'un işlemesi için zamanla
      if (!existing) {
        await prisma.socialPost.create({
          data: {
            articleId,
            platform: toEnumValue(platform),
            status: "SCHEDULED",
            scheduledAt,
          },
        });
      }
      result.scheduled.push(platform);
    }
  }

  return result;
}
