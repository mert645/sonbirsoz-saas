import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isCronAuthorized } from "@/lib/cron-auth";
import { isEmailConfigured, sendEmailBatch } from "@/lib/email/ses-client";
import { dailyBulletinEmail, type BulletinArticle } from "@/lib/email/templates";
import { SITE_URL } from "@/lib/utils/constants";
import { withUtm } from "@/lib/utils/utm";

export const maxDuration = 300;

/**
 * Günlük bülten cron'u (her sabah): son 24 saatin öne çıkan haberlerini
 * aktif abonelere gönderir. Kategori tercihi olan abonelere kendi
 * kategorilerinden, olmayanlara genel seçkiden içerik gider.
 */
export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isEmailConfigured()) {
    return NextResponse.json({
      success: true,
      message: "E-posta yapılandırılmamış (EMAIL_FROM + AWS kimlik bilgileri gerekli)",
      sent: 0,
    });
  }

  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [articles, subscribers] = await Promise.all([
      prisma.article.findMany({
        where: { status: "PUBLISHED", publishedAt: { gte: since } },
        orderBy: [{ isBreaking: "desc" }, { viewCount: "desc" }],
        take: 30,
        select: {
          title: true,
          spot: true,
          slug: true,
          coverImage: true,
          category: { select: { name: true, slug: true } },
        },
      }),
      prisma.newsletterSubscriber.findMany({
        where: { isActive: true },
        select: {
          email: true,
          categories: true,
          unsubscribeToken: true,
        },
      }),
    ]);

    if (articles.length === 0 || subscribers.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Gönderilecek içerik veya abone yok",
        articles: articles.length,
        subscribers: subscribers.length,
        sent: 0,
      });
    }

    const toBulletin = (list: typeof articles): BulletinArticle[] =>
      list.slice(0, 10).map((a) => ({
        title: a.title,
        spot: a.spot,
        url: withUtm(`${SITE_URL}/${a.category.slug}/${a.slug}`, {
          source: "newsletter",
          medium: "email",
          campaign: "daily-bulletin",
        }),
        category: a.category.name,
        image: a.coverImage,
      }));

    const generalSelection = toBulletin(articles);

    const emails = subscribers.map((sub) => {
      // Kategori tercihi varsa önce o kategorilerden doldur
      let selection = generalSelection;
      if (sub.categories.length > 0) {
        const preferred = articles.filter((a) =>
          sub.categories.includes(a.category.slug)
        );
        if (preferred.length >= 3) {
          const rest = articles.filter(
            (a) => !sub.categories.includes(a.category.slug)
          );
          selection = toBulletin([...preferred, ...rest]);
        }
      }
      const unsubscribeUrl = `${SITE_URL}/api/newsletter/unsubscribe?token=${sub.unsubscribeToken}`;
      const mail = dailyBulletinEmail(selection, unsubscribeUrl);
      return { to: sub.email, ...mail };
    });

    const sent = await sendEmailBatch(emails);

    // Gönderim zamanını işaretle
    await prisma.newsletterSubscriber.updateMany({
      where: { email: { in: subscribers.map((s) => s.email) } },
      data: { lastSentAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      articles: articles.length,
      subscribers: subscribers.length,
      sent,
    });
  } catch (error) {
    console.error("daily-bulletin cron failed:", error);
    return NextResponse.json(
      { error: "daily-bulletin failed", details: String(error) },
      { status: 500 }
    );
  }
}
