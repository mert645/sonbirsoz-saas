import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { isCronAuthorized } from "@/lib/cron-auth";
import { invokeBedrockJSON } from "@/lib/ai/bedrock-client";
import { sendPushToAll } from "@/lib/push/push-sender";

export const maxDuration = 120;

/**
 * 5 dakikada bir çalışır: son yayınlanan haberler + işlenmemiş RSS öğelerinden
 * Bedrock ile 1 cümlelik "Son Dakika" özetleri üretir ve SiteSettings
 * (breaking_ticker) altında saklar. Kritik işaretli yeni öğelerde web push atar.
 */

interface TickerItem {
  text: string;
  href: string | null;
  critical: boolean;
  at: string;
}

const TICKER_KEY = "breaking_ticker";
const MAX_ITEMS = 8;

const SYSTEM_PROMPT = `Sen bir Türk haber ajansının son dakika editörüsün. Verilen haber başlıkları/özetlerinden kayan yazı (ticker) için KISA son dakika özetleri üret.

KURALLAR:
- Her özet TEK cümle, en fazla 90 karakter
- Tarafsız ajans dili, "iddia edildi/açıklandı" gibi net kaynaklama
- En önemli ve en yeni haberleri seç (en fazla ${MAX_ITEMS} adet)
- Aynı olayın tekrarını birleştir
- critical: yalnızca gerçekten acil/çok önemli gelişmelerde true (deprem, büyük saldırı, seçim sonucu, ekonomik şok)

ÇIKTI (yalnızca JSON):
{"items": [{"index": 0, "text": "özet cümle", "critical": false}]}
index = kaynak listesindeki haber numarası (link eşleştirme için).`;

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Kaynak: son 90 dakikadaki yayınlanmış haberler + son RSS öğeleri
    const since = new Date(Date.now() - 90 * 60 * 1000);
    const [articles, rssItems] = await Promise.all([
      prisma.article.findMany({
        where: { status: "PUBLISHED", publishedAt: { gte: since } },
        orderBy: { publishedAt: "desc" },
        take: 12,
        select: {
          title: true,
          spot: true,
          slug: true,
          isBreaking: true,
          publishedAt: true,
          category: { select: { slug: true } },
        },
      }),
      prisma.rSSItem.findMany({
        where: { createdAt: { gte: since } },
        orderBy: { pubDate: "desc" },
        take: 10,
        select: { title: true, description: true, link: true, pubDate: true },
      }),
    ]);

    type SourceItem = {
      title: string;
      detail: string;
      href: string | null;
      at: string;
    };
    const sources: SourceItem[] = [
      ...articles.map((a) => ({
        title: a.title,
        detail: a.spot || "",
        href: `/${a.category.slug}/${a.slug}`,
        at: (a.publishedAt || new Date()).toISOString(),
      })),
      ...rssItems.map((r) => ({
        title: r.title,
        detail: r.description?.slice(0, 200) || "",
        href: null, // dış link — ticker'da tıklanmaz
        at: (r.pubDate || new Date()).toISOString(),
      })),
    ];

    if (sources.length === 0) {
      return NextResponse.json({ success: true, message: "Yeni içerik yok", items: 0 });
    }

    let items: TickerItem[];
    const hasAI =
      !!process.env.CUSTOM_AWS_ACCESS_KEY_ID || !!process.env.AWS_ACCESS_KEY_ID;

    if (hasAI) {
      try {
        const sourceText = sources
          .map((s, i) => `[${i}] ${s.title}${s.detail ? ` — ${s.detail}` : ""}`)
          .join("\n");
        const result = await invokeBedrockJSON<{
          items: { index: number; text: string; critical?: boolean }[];
        }>(
          [{ role: "user", content: `Kaynak haberler:\n${sourceText}` }],
          { system: SYSTEM_PROMPT, maxTokens: 1024, temperature: 0.2 }
        );
        items = (result.items || [])
          .filter((i) => i.text && i.text.length > 5)
          .slice(0, MAX_ITEMS)
          .map((i) => ({
            text: i.text.slice(0, 120),
            href: sources[i.index]?.href ?? null,
            critical: !!i.critical,
            at: sources[i.index]?.at || new Date().toISOString(),
          }));
      } catch (err) {
        console.error("breaking-summary AI hatası, başlık fallback:", err);
        items = [];
      }
    } else {
      items = [];
    }

    // AI yoksa/başarısızsa: başlıkları doğrudan kullan
    if (items.length === 0) {
      items = sources.slice(0, MAX_ITEMS).map((s) => ({
        text: s.title.slice(0, 120),
        href: s.href,
        critical: false,
        at: s.at,
      }));
    }

    // Önceki ticker ile karşılaştır — yeni kritik öğelerde push gönder
    let pushed = 0;
    try {
      const prev = await prisma.siteSettings.findUnique({ where: { key: TICKER_KEY } });
      const prevTexts = new Set(
        ((prev?.value as { items?: TickerItem[] } | null)?.items || []).map((i) => i.text)
      );
      const newCritical = items.filter((i) => i.critical && !prevTexts.has(i.text));
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
      for (const item of newCritical.slice(0, 2)) {
        pushed += await sendPushToAll({
          title: "SON DAKİKA",
          body: item.text,
          url: item.href ? `${siteUrl}${item.href}` : siteUrl,
          icon: `${siteUrl}/icons/icon-192.png`,
        });
      }
    } catch {
      // push best-effort
    }

    // Prisma Json alanı için düz JSON'a çevir
    const tickerValue = JSON.parse(
      JSON.stringify({ items, updatedAt: new Date().toISOString() })
    );
    await prisma.siteSettings.upsert({
      where: { key: TICKER_KEY },
      update: { value: tickerValue },
      create: {
        id: TICKER_KEY,
        key: TICKER_KEY,
        value: tickerValue,
      },
    });

    // Ana sayfa ticker'ı tazele
    try {
      revalidatePath("/");
    } catch {
      /* best-effort */
    }

    return NextResponse.json({
      success: true,
      items: items.length,
      critical: items.filter((i) => i.critical).length,
      pushSent: pushed,
      aiUsed: hasAI,
    });
  } catch (error) {
    console.error("breaking-summary cron failed:", error);
    return NextResponse.json(
      { error: "breaking-summary failed", details: String(error) },
      { status: 500 }
    );
  }
}
