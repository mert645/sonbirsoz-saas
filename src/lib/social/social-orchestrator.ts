import { postToTwitter, formatTwitterContent } from "./twitter-client";
import { postToTelegram, formatTelegramContent } from "./telegram-client";
import { postToFacebook, formatFacebookContent } from "./facebook-client";
import { postToInstagram, formatInstagramCaption } from "./instagram-client";
import {
  uploadYouTubeShort,
  isYouTubeConfigured,
  formatYouTubeContent,
} from "./youtube-client";
import { socialPostUrl } from "@/lib/utils/utm";
import { prisma } from "@/lib/db";

export type Platform = "twitter" | "instagram" | "facebook" | "telegram" | "youtube";

export interface ArticleForSocial {
  id: string;
  title: string;
  spot: string;
  slug: string;
  category: string;
  tags: string[];
  coverImage?: string;
  socialSquareImage?: string;
}

export interface PostResult {
  platform: Platform;
  success: boolean;
  externalId?: string;
  error?: string;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.sonbirsoz.com";

function buildArticleUrl(article: ArticleForSocial): string {
  return `${SITE_URL}/${article.category}/${article.slug}`;
}

export async function postToAllPlatforms(
  article: ArticleForSocial,
  platforms: Platform[]
): Promise<PostResult[]> {
  const results: PostResult[] = [];
  const baseUrl = buildArticleUrl(article);

  for (const platform of platforms) {
    // Her platforma kaynak takibi için kendi UTM'li linki verilir
    const url = socialPostUrl(baseUrl, platform);
    try {
      switch (platform) {
        case "twitter": {
          const content = formatTwitterContent(article.title, url, article.tags);
          const result = await postToTwitter({ text: content, mediaUrl: article.coverImage });
          results.push({ platform, success: true, externalId: result.id });
          break;
        }
        case "telegram": {
          const content = formatTelegramContent(article.title, article.spot, url, article.tags);
          const result = await postToTelegram({ text: content, imageUrl: article.coverImage });
          results.push({ platform, success: true, externalId: String(result.messageId) });
          break;
        }
        case "facebook": {
          const content = formatFacebookContent(article.title, article.spot, url);
          const result = await postToFacebook({ message: content, link: url, imageUrl: article.coverImage });
          results.push({ platform, success: true, externalId: result.id });
          break;
        }
        case "instagram": {
          if (!article.socialSquareImage && !article.coverImage) {
            results.push({ platform, success: false, error: "No image available for Instagram" });
            break;
          }
          const caption = formatInstagramCaption(article.title, article.spot, article.tags);
          const result = await postToInstagram({
            imageUrl: (article.socialSquareImage || article.coverImage)!,
            caption,
          });
          results.push({ platform, success: true, externalId: result.id });
          break;
        }
        case "youtube": {
          // YouTube yayını video pipeline'ına bağlı: makale için üretilmiş
          // (COMPLETED) bir Shorts videosu varsa onu yükler; yoksa atlanır.
          if (!isYouTubeConfigured()) {
            results.push({ platform, success: false, error: "YouTube OAuth yapılandırılmamış" });
            break;
          }
          const video = await prisma.mediaGeneration.findFirst({
            where: {
              articleId: article.id,
              purpose: "VIDEO",
              status: "COMPLETED",
              resultUrl: { not: null },
            },
            orderBy: { completedAt: "desc" },
          });
          if (!video?.resultUrl) {
            results.push({
              platform,
              success: false,
              error: "Makale için üretilmiş Shorts videosu yok (önce admin panelinden üretin)",
            });
            break;
          }
          const description = formatYouTubeContent(article.title, article.spot, url);
          const result = await uploadYouTubeShort({
            videoUrl: video.resultUrl,
            title: article.title,
            description,
            tags: article.tags,
          });
          results.push({ platform, success: true, externalId: result.id });
          break;
        }
      }
    } catch (error) {
      results.push({
        platform,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}

/**
 * Staggered posting with delays between platforms.
 * Twitter & Telegram: immediate
 * Facebook: +5 min
 * Instagram: +15 min
 * YouTube: +30 min
 */
export function getPostingSchedule(platforms: Platform[]): { platform: Platform; delayMs: number }[] {
  const delays: Record<Platform, number> = {
    twitter: 0,
    telegram: 0,
    facebook: 5 * 60 * 1000,
    instagram: 15 * 60 * 1000,
    youtube: 30 * 60 * 1000,
  };

  return platforms
    .map((platform) => ({ platform, delayMs: delays[platform] }))
    .sort((a, b) => a.delayMs - b.delayMs);
}
