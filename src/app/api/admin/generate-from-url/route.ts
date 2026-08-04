import { NextRequest, NextResponse } from "next/server";
import { requireEditor } from "@/lib/data/article-mutations";
import { generateArticleFromSources } from "@/lib/ai/news-generator";

export const maxDuration = 120;

/** URL'nin HTML içeriğinden metin çıkar */
async function scrapeUrl(url: string): Promise<{ title: string; description: string }> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "tr-TR,tr;q=0.9",
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) throw new Error(`Sayfa getirilemedi (HTTP ${res.status})`);

  const html = await res.text();

  // OpenGraph / meta title
  const ogTitle =
    html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i)?.[1];
  const metaTitle =
    html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim();
  const title = (ogTitle || metaTitle || "").slice(0, 300).trim();

  // OpenGraph / meta description
  const ogDesc =
    html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i)?.[1];
  const metaDesc =
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i)?.[1];

  // Ana içeriği bulmaya çalış — makale/haber elementleri
  const bodyText = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, " ")
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, " ")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 4000);

  const description = (ogDesc || metaDesc || bodyText).slice(0, 2000).trim();

  if (!title) throw new Error("Sayfadan başlık alınamadı. Farklı bir URL deneyin.");

  return { title, description };
}

export async function POST(request: NextRequest) {
  const user = await requireEditor();
  if (!user) return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const url: string = body?.url?.trim();

  if (!url || !/^https?:\/\/.+/.test(url)) {
    return NextResponse.json({ error: "Geçerli bir URL girin." }, { status: 400 });
  }

  try {
    const scraped = await scrapeUrl(url);

    const article = await generateArticleFromSources([
      {
        title: scraped.title,
        description: scraped.description,
        link: url,
        source: new URL(url).hostname.replace("www.", ""),
      },
    ]);

    return NextResponse.json({ success: true, article });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("URL-to-article error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
