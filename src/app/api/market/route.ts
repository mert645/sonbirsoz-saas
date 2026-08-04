import { NextResponse } from "next/server";

export const revalidate = 600; // sunucu tarafı 10 dk cache (finansal veri)

interface MarketItem {
  name: string;
  value: string;
  change: number;
}

async function safeFetch(urls: string[]): Promise<Response> {
  for (const url of urls) {
    try {
      const res = await fetch(url, { next: { revalidate: 600 } });
      if (res.ok) return res;
    } catch {
      // bir sonraki URL'yi dene
    }
  }
  throw new Error("Tüm kaynaklar başarısız");
}

function toTRY(value: number): string {
  if (value >= 100_000) return value.toLocaleString("tr-TR", { maximumFractionDigits: 0 });
  if (value >= 1_000) return value.toLocaleString("tr-TR", { maximumFractionDigits: 0 });
  return value.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pct(current: number, prev: number): number {
  if (!prev || prev === 0) return 0;
  return parseFloat((((current - prev) / prev) * 100).toFixed(2));
}

export async function GET() {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yDate = yesterday.toISOString().split("T")[0];

    // Bugünkü ve dünkü TRY bazlı kurlar
    const [todayRes, prevRes] = await Promise.all([
      safeFetch([
        "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/try.json",
        "https://latest.currency-api.pages.dev/v1/currencies/try.json",
      ]),
      safeFetch([
        `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${yDate}/v1/currencies/try.json`,
        `https://${yDate}.currency-api.pages.dev/v1/currencies/try.json`,
      ]),
    ]);

    const todayData = await todayRes.json();
    const prevData = await prevRes.json();
    const fx: Record<string, number> = todayData.try ?? {};
    const px: Record<string, number> = prevData.try ?? {};

    // 1 birim yabancı para = 1 / fx[kod] TRY
    const usd = fx.usd ? 1 / fx.usd : 0;
    const eur = fx.eur ? 1 / fx.eur : 0;
    const gbp = fx.gbp ? 1 / fx.gbp : 0;
    const xauGram = fx.xau ? (1 / fx.xau) / 31.1035 : 0; // ons → gram
    const xagGram = fx.xag ? (1 / fx.xag) / 31.1035 : 0;

    const pusd = px.usd ? 1 / px.usd : usd;
    const peur = px.eur ? 1 / px.eur : eur;
    const pgbp = px.gbp ? 1 / px.gbp : gbp;
    const pxauGram = px.xau ? (1 / px.xau) / 31.1035 : xauGram;
    const pxagGram = px.xag ? (1 / px.xag) / 31.1035 : xagGram;

    // Kripto — CoinGecko ücretsiz API
    let btc = 0, eth = 0, btcChg = 0, ethChg = 0;
    try {
      const cgRes = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=try&include_24hr_change=true",
        { next: { revalidate: 600 } }
      );
      if (cgRes.ok) {
        const cg = await cgRes.json();
        btc = cg.bitcoin?.try ?? 0;
        eth = cg.ethereum?.try ?? 0;
        btcChg = cg.bitcoin?.try_24h_change ?? 0;
        ethChg = cg.ethereum?.try_24h_change ?? 0;
      }
    } catch { /* kripto isteğe bağlı */ }

    // BIST 100 — Yahoo Finance
    let bist = 0, bistChg = 0;
    try {
      const bistRes = await fetch(
        "https://query1.finance.yahoo.com/v8/finance/chart/XU100.IS?interval=1d&range=2d",
        { next: { revalidate: 600 } }
      );
      if (bistRes.ok) {
        const bd = await bistRes.json();
        const meta = bd?.chart?.result?.[0]?.meta;
        if (meta) {
          bist = meta.regularMarketPrice ?? 0;
          const prev = meta.previousClose ?? meta.chartPreviousClose ?? 0;
          bistChg = pct(bist, prev);
        }
      }
    } catch { /* bist isteğe bağlı */ }

    const items: MarketItem[] = [
      { name: "DOLAR",   value: toTRY(usd),     change: pct(usd, pusd) },
      { name: "EURO",    value: toTRY(eur),     change: pct(eur, peur) },
      { name: "STERLİN", value: toTRY(gbp),     change: pct(gbp, pgbp) },
      { name: "ALTIN",   value: toTRY(xauGram), change: pct(xauGram, pxauGram) },
      { name: "GÜMÜŞ",   value: toTRY(xagGram), change: pct(xagGram, pxagGram) },
      ...(bist > 0 ? [{ name: "BIST",  value: toTRY(bist), change: parseFloat(bistChg.toFixed(2)) }] : []),
      ...(btc  > 0 ? [{ name: "BTC",   value: toTRY(btc),  change: parseFloat(btcChg.toFixed(2))  }] : []),
      ...(eth  > 0 ? [{ name: "ETH",   value: toTRY(eth),  change: parseFloat(ethChg.toFixed(2))  }] : []),
    ];

    return NextResponse.json(
      { items, updatedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=120" } }
    );
  } catch (err) {
    console.error("Market API error:", err);
    return NextResponse.json({ items: [], updatedAt: null }, { status: 500 });
  }
}
