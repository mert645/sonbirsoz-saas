/**
 * Kampanya ölçümlemesi için URL'lere UTM parametreleri ekler.
 * Mevcut query parametreleri korunur; var olan utm_* değerleri üzerine yazılır.
 */
export interface UtmParams {
  source: string;
  medium: string;
  campaign?: string;
  content?: string;
  term?: string;
}

export function withUtm(url: string, utm: UtmParams): string {
  try {
    const u = new URL(url);
    u.searchParams.set("utm_source", utm.source);
    u.searchParams.set("utm_medium", utm.medium);
    if (utm.campaign) u.searchParams.set("utm_campaign", utm.campaign);
    if (utm.content) u.searchParams.set("utm_content", utm.content);
    if (utm.term) u.searchParams.set("utm_term", utm.term);
    return u.toString();
  } catch {
    return url;
  }
}

/** Sosyal medya otomatik paylaşımları için platform bazlı UTM. */
export function socialPostUrl(url: string, platform: string): string {
  return withUtm(url, {
    source: platform,
    medium: "social",
    campaign: "auto-post",
  });
}

/** Kullanıcı paylaşım butonları için UTM. */
export function userShareUrl(url: string, channel: string): string {
  return withUtm(url, {
    source: channel,
    medium: "share",
    campaign: "user-share",
  });
}
