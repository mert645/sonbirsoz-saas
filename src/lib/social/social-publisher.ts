import type { Platform } from "./social-orchestrator";

/**
 * Social publisher - Multi-tenant yapıya geçiş nedeniyle devre dışı.
 * TODO: tenantId parametresi ile yeniden implemente edilmeli.
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

export interface PublishSocialResult {
  immediate: { platform: Platform; success: boolean; error?: string }[];
  scheduled: Platform[];
}

/**
 * Social publishing is disabled in multi-tenant mode.
 * TODO: Re-implement with tenantId parameter.
 */
export async function publishArticleToSocial(_articleId: string): Promise<PublishSocialResult> {
  return { immediate: [], scheduled: [] };
}
