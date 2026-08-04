import { prisma } from "@/lib/db";
import { isEmailConfigured, sendEmailBatch } from "./ses-client";
import { breakingEmail } from "./templates";
import { SITE_URL } from "@/lib/utils/constants";
import { withUtm } from "@/lib/utils/utm";

/**
 * Son dakika haberini tüm aktif abonelere anında e-postayla gönderir.
 * Best-effort: e-posta yapılandırılmamışsa veya hata olursa 0 döner.
 */
export async function sendBreakingEmailToSubscribers(article: {
  title: string;
  spot: string | null;
  slug: string;
  categorySlug: string;
}): Promise<number> {
  if (!isEmailConfigured()) return 0;

  try {
    const subscribers = await prisma.newsletterSubscriber.findMany({
      where: { isActive: true },
      select: { email: true, unsubscribeToken: true },
    });
    if (subscribers.length === 0) return 0;

    const url = withUtm(`${SITE_URL}/${article.categorySlug}/${article.slug}`, {
      source: "newsletter",
      medium: "email",
      campaign: "breaking",
    });

    const emails = subscribers.map((sub) => {
      const unsubscribeUrl = `${SITE_URL}/api/newsletter/unsubscribe?token=${sub.unsubscribeToken}`;
      const mail = breakingEmail(article.title, article.spot, url, unsubscribeUrl);
      return { to: sub.email, ...mail };
    });

    return await sendEmailBatch(emails);
  } catch (error) {
    console.error("Breaking email send failed:", error);
    return 0;
  }
}
