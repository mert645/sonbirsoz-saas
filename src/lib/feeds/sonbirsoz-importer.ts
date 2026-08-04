import Parser from "rss-parser";
import { sanitizeArticleHtml } from "@/lib/utils/sanitize";

// ─────────────────────────────────────────────────────────────────────
// sonbirsoz.com içe aktarma: canlı sitedeki güncel haberleri RSS + haber
// sitemap'inden çekip, her haberin sayfasından görsel/kategori/tarih
// zenginleştirmesi yaparak yapılandırılmış Article verisine dönüştürür.
// Prisma'ya doğrudan bağımlı DEĞİLDİR; ham veri döndürür, yazma işini
// çağıran (script veya API route) yapar.
// ─────────────────────────────────────────────────────────────────────

export const SONBIRSOZ_RSS_URL = "https://www.sonbirsoz.com/rss/1";
export const SONBIRSOZ_NEWS_SITEMAP = "https://www.sonbirsoz.com/sitemap-news.xml";
export const SONBIRSOZ_SITEMAP_INDEX = "https://www.sonbirsoz.com/sitemap.xml";
const BASE = "https://www.sonbirsoz.com";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

// Sitedeki kategori adlarını projedeki kategori slug'larına eşle.
const CATEGORY_MAP: Record<string, string> = {
  gündem: "gundem",
  gundem: "gundem",
  haberler: "gundem",
  politika: "politika",
  spor: "spor",
  magazin: "magazin",
  sağlık: "saglik",
  saglik: "saglik",
  yaşam: "yasam",
  yasam: "yasam",
  dünya: "dunya",
  dunya: "dunya",
  ekonomi: "ekonomi",
  borsa: "ekonomi",
  finans: "ekonomi",
  teknoloji: "teknoloji",
  "kültür & sanat": "kultur",
  "kültür&sanat": "kultur",
  "kultur-sanat": "kultur",
  kültür: "kultur",
  kultur: "kultur",
  türkiye: "gundem",
  turkiye: "gundem",
  genel: "gundem",
  "özel haber": "gundem",
  röportaj: "gundem",
};

// Başlık/spot metninden kategori tahmini için anahtar kelimeler (öncelik sıralı).
// Site kategori bilgisini sayfada güvenilir vermediğinden içerik-bazlı sınıflandırma.
const CATEGORY_KEYWORDS: { slug: string; words: string[] }[] = [
  {
    slug: "spor",
    words: [
      "futbol", "basketbol", "voleybol", "maç", "gol", "galatasaray",
      "fenerbahçe", "beşiktaş", "trabzonspor", "süper lig", "şampiyon",
      "transfer", "teknik direktör", "milli takım", "uefa", "fifa", "lig",
      "hakem", "penaltı", "derbi", "kupa", "olimpiyat", "tenis", "formula",
      "pehlivan", "güreş", "atletizm", "antrenör", "puan durumu",
    ],
  },
  {
    slug: "ekonomi",
    words: [
      "dolar", "euro", "altın", "borsa", "faiz", "enflasyon", "zam",
      "asgari ücret", "merkez bankası", "ekonomi", "vergi", "ihracat",
      "ithalat", "bütçe", "kredi", "piyasa", "yatırım", "gram altın",
      "döviz", "milli gelir", "büyüme", "istihdam", "emekli", "maaş",
      "tüfe", "üfe", "banka", "şirket", "milyar", "milyon lira",
    ],
  },
  {
    slug: "dunya",
    words: [
      "abd", "rusya", "ukrayna", "israil", "filistin", "gazze", "avrupa",
      "almanya", "fransa", "ingiltere", "çin", "iran", "irak", "suriye",
      "nato", "birleşmiş milletler", "beyaz saray", "putin", "trump",
      "netanyahu", "washington", "moskova", "brüksel", "savaş", "ateşkes",
    ],
  },
  {
    slug: "teknoloji",
    words: [
      "yapay zeka", "teknoloji", "yazılım", "uygulama", "iphone", "android",
      "samsung", "apple", "google", "microsoft", "chatgpt", "openai",
      "robot", "uzay", "spacex", "internet", "siber", "telefon", "bilgisayar",
      "elektrikli araç", "tesla", "sosyal medya", "instagram", "whatsapp",
    ],
  },
  {
    slug: "saglik",
    words: [
      "sağlık", "hastane", "doktor", "hastalık", "aşı", "virüs", "kanser",
      "tedavi", "ilaç", "grip", "salgın", "ameliyat", "diyet", "beslenme",
      "korona", "covid", "sağlık bakanlığı", "hasta", "epidemi",
    ],
  },
  {
    slug: "magazin",
    words: [
      "ünlü", "oyuncu", "şarkıcı", "dizi", "sanatçı", "magazin", "aşk",
      "evlilik", "boşanma", "sevgili", "instagram paylaşımı", "kırmızı halı",
      "konser", "ödül töreni", "yıldız", "fenomen", "sosyetik",
    ],
  },
  {
    slug: "politika",
    words: [
      "cumhurbaşkanı", "erdoğan", "meclis", "tbmm", "bakan", "milletvekili",
      "chp", "akp", "mhp", "iyi parti", "seçim", "parti", "muhalefet",
      "kabine", "anayasa", "siyaset", "özel", "bahçeli", "imamoğlu", "kılıçdaroğlu",
    ],
  },
  {
    slug: "kultur",
    words: [
      "kültür", "sanat", "müze", "sergi", "tiyatro", "film", "sinema",
      "kitap", "roman", "festival", "ödül", "edebiyat", "tarih", "eser",
      "ressam", "heykel", "opera", "bienal",
    ],
  },
  {
    slug: "yasam",
    words: [
      "yaşam", "hava durumu", "trafik", "eğitim", "okul", "üniversite",
      "öğrenci", "sınav", "yks", "lgs", "seyahat", "tatil", "yemek",
      "moda", "ilişki", "psikoloji", "çevre", "hayvan", "doğa",
    ],
  },
];

/** Başlık + spot metninden en olası kategori slug'ını tahmin eder. */
export function classifyCategory(title: string, spot: string | null): string {
  const text = `${title} ${spot ?? ""}`.toLowerCase();
  let best = "gundem";
  let bestScore = 0;
  for (const { slug, words } of CATEGORY_KEYWORDS) {
    let score = 0;
    for (const w of words) if (text.includes(w)) score++;
    if (score > bestScore) {
      bestScore = score;
      best = slug;
    }
  }
  return best;
}

export interface ImportedArticle {
  title: string;
  slug: string;
  spot: string | null;
  content: string; // temizlenmiş HTML
  coverImage: string | null;
  coverImageAlt: string | null;
  categorySlug: string;
  sourceUrl: string;
  publishedAt: Date | null;
}

const parser = new Parser({
  headers: { "User-Agent": UA },
  timeout: 20_000,
  customFields: { item: ["content:encoded"] },
});

function toSlug(input: string): string {
  const map: Record<string, string> = {
    ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u",
    Ç: "c", Ğ: "g", İ: "i", Ö: "o", Ş: "s", Ü: "u",
  };
  return input
    .split("")
    .map((ch) => map[ch] ?? ch)
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
}

/** Sayfa URL'inin son parçasını slug olarak kullan (site zaten slug'lı URL veriyor). */
function slugFromUrl(url: string, fallbackTitle: string): string {
  try {
    const path = new URL(url).pathname.replace(/^\/+|\/+$/g, "");
    if (path && !path.includes("/")) return path.slice(0, 120);
  } catch {
    /* ignore */
  }
  return toSlug(fallbackTitle);
}

/** Reklam/script kalıntılarını eleyip allow-list ile güvenli HTML'e indirger. */
function cleanContentHtml(html: string): string {
  // Önce kaynağa özgü reklam bloklarını kabaca ayıkla; ardından
  // sanitize-html ile allow-list tabanlı güvenli çıktı üret (XSS koruması).
  const preCleaned = html
    .replace(/<div[^>]*id=["']ad_[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, "")
    .replace(/<div[^>]*data-advert=[^>]*>[\s\S]*?<\/div>/gi, "")
    .replace(/(\r?\n){3,}/g, "\n\n")
    .trim();
  return sanitizeArticleHtml(preCleaned);
}

function stripHtml(html: string): string {
  return decodeHtmlEntities(
    html.replace(/<[^>]+>/g, " ").replace(/\s{2,}/g, " "),
  ).trim();
}

/** Yaygın HTML entity'lerini (metinsel + sayısal) çöz. */
function decodeHtmlEntities(input: string): string {
  if (!input) return input;
  const named: Record<string, string> = {
    "&nbsp;": " ",
    "&amp;": "&",
    "&quot;": '"',
    "&apos;": "'",
    "&lt;": "<",
    "&gt;": ">",
    "&hellip;": "…",
    "&ldquo;": "\u201c",
    "&rdquo;": "\u201d",
    "&lsquo;": "\u2018",
    "&rsquo;": "\u2019",
    "&ndash;": "–",
    "&mdash;": "—",
  };
  return input
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)))
    .replace(/&#x([\dA-Fa-f]+);/g, (_, h) =>
      String.fromCodePoint(parseInt(h, 16)),
    )
    .replace(/&[a-zA-Z]+;/g, (m) => named[m] ?? m);
}

function metaContent(html: string, prop: string): string | undefined {
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`,
      "i",
    ),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return m[1].trim();
  }
  return undefined;
}

/** Haber sayfasından og:image, kategori, tarih ve (RSS yoksa) içerik çıkar. */
async function enrichFromPage(url: string): Promise<{
  coverImage: string | null;
  coverImageAlt: string | null;
  categorySlug: string | null;
  publishedAt: Date | null;
  spot: string | null;
  title: string | null;
  bodyHtml: string | null;
  ogType: string | null;
}> {
  const empty = {
    coverImage: null,
    coverImageAlt: null,
    categorySlug: null,
    publishedAt: null,
    spot: null,
    title: null,
    bodyHtml: null,
    ogType: null,
  };
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, "Accept-Language": "tr-TR,tr;q=0.9" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return empty;
    const html = await res.text();

    const coverImage =
      metaContent(html, "og:image") || metaContent(html, "twitter:image") || null;
    const spot = decodeHtmlEntities(metaContent(html, "og:description") || "") || null;
    const title = decodeHtmlEntities(metaContent(html, "og:title") || "") || null;
    const publishedRaw =
      metaContent(html, "og:article:published_time") ||
      metaContent(html, "article:published_time");
    const publishedAt = publishedRaw ? new Date(publishedRaw) : null;

    // İçerik: JSON-LD articleBody (reklamsız düz metin) — RSS yoksa kullanılır.
    let bodyHtml: string | null = null;
    const abMatch = html.match(
      /"articleBody"\s*:\s*"((?:[^"\\]|\\.)*)"/,
    );
    if (abMatch?.[1]) {
      const text = decodeHtmlEntities(decodeJsonString(abMatch[1]));
      if (text.length > 60) {
        // Paragraflara böl (çift boşluk / satır sonu).
        bodyHtml = text
          .split(/\n{2,}|\r\n{2,}/)
          .map((p) => p.trim())
          .filter(Boolean)
          .map((p) => `<p>${p}</p>`)
          .join("\n") || `<p>${text}</p>`;
      }
    }

    // Kategori: JSON-LD BreadcrumbList'ten spesifik kategori öğesi.
    // "Haberler"/"Ana Sayfa"/"Gündem" gibi kök/genel etiketler kategori sinyali
    // SAYILMAZ; bu sitede breadcrumb genelde yalnız "Haberler" içerir. Bu durumda
    // null bırakılır ve içerik-bazlı classifyCategory devreye girer.
    const GENERIC_BREADCRUMB = new Set([
      "haberler",
      "ana sayfa",
      "anasayfa",
      "gündem",
      "gundem",
      "genel",
      "türkiye",
      "turkiye",
      "son dakika",
    ]);
    let categorySlug: string | null = null;
    const bc = html.match(
      /"BreadcrumbList"[\s\S]*?"itemListElement":\s*\[([\s\S]*?)\]/,
    );
    if (bc) {
      const names = [...bc[1].matchAll(/"name":"([^"]+)"/g)].map((m) =>
        decodeJsonString(m[1]),
      );
      for (const n of names) {
        const key = n.trim().toLowerCase();
        if (GENERIC_BREADCRUMB.has(key)) continue; // kök/genel → classifier'a bırak
        if (CATEGORY_MAP[key]) {
          categorySlug = CATEGORY_MAP[key];
          break;
        }
      }
    }

    return {
      coverImage,
      coverImageAlt: coverImage ? null : null,
      categorySlug,
      publishedAt: publishedAt && !isNaN(publishedAt.getTime()) ? publishedAt : null,
      spot,
      title,
      bodyHtml,
      ogType: metaContent(html, "og:type") || null,
    };
  } catch {
    return empty;
  }
}

/** JSON string kaçışlarını (\uXXXX, \n, \" vb.) çöz. */
function decodeJsonString(s: string): string {
  try {
    return JSON.parse(`"${s.replace(/"/g, '\\"')}"`);
  } catch {
    return s
      .replace(/\\u([\dA-Fa-f]{4})/g, (_, h) =>
        String.fromCharCode(parseInt(h, 16)),
      )
      .replace(/\\n/g, "\n")
      .replace(/\\"/g, '"')
      .replace(/\\\//g, "/")
      .replace(/\\\\/g, "\\");
  }
}

/** RSS beslemesinden ham item'ları al. */
async function fetchRssItems(): Promise<
  { title: string; link: string; description: string; content: string; pubDate?: string }[]
> {
  try {
    const feed = await parser.parseURL(SONBIRSOZ_RSS_URL);
    return (feed.items || [])
      .filter((i) => i.link && i.title)
      .map((i) => ({
        title: i.title!.trim(),
        link: i.link!.trim(),
        description: (i.contentSnippet || i.summary || "").trim(),
        content:
          ((i as unknown as Record<string, unknown>)[
            "content:encoded"
          ] as string) ||
          i.content ||
          "",
        pubDate: i.pubDate,
      }));
  } catch {
    return [];
  }
}

/** News sitemap'ten ek haber URL'lerini al (RSS'te olmayanlar için). */
async function fetchSitemapUrls(): Promise<string[]> {
  try {
    const res = await fetch(SONBIRSOZ_NEWS_SITEMAP, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
      .map((m) => m[1].trim())
      .filter((u) => u.startsWith(BASE) && !u.includes("/sitemap"));
  } catch {
    return [];
  }
}

export interface ImportOptions {
  /** İşlenecek maksimum haber sayısı (varsayılan 60). */
  limit?: number;
  /** Sayfa zenginleştirmesi için eşzamanlılık (varsayılan 5). */
  concurrency?: number;
}

/**
 * sonbirsoz.com'daki güncel haberleri toplar ve yapılandırılmış ImportedArticle
 * dizisi döndürür. RSS (tam içerik) birincil; sitemap ek URL kaynağı. Her haber
 * kendi sayfasından görsel/kategori/tarih ile zenginleştirilir.
 */
export async function fetchSonbirsozArticles(
  opts: ImportOptions = {},
): Promise<ImportedArticle[]> {
  const limit = opts.limit ?? 60;
  const concurrency = opts.concurrency ?? 5;

  const rssItems = await fetchRssItems();
  const rssByUrl = new Map(rssItems.map((i) => [i.link, i]));

  const sitemapUrls = await fetchSitemapUrls();

  // Birleşik, sırası korunmuş benzersiz URL listesi (RSS önce, sonra sitemap).
  const orderedUrls: string[] = [];
  const seen = new Set<string>();
  for (const i of rssItems) {
    if (!seen.has(i.link)) {
      seen.add(i.link);
      orderedUrls.push(i.link);
    }
  }
  for (const u of sitemapUrls) {
    if (!seen.has(u)) {
      seen.add(u);
      orderedUrls.push(u);
    }
  }

  const targets = orderedUrls.slice(0, limit);
  const results: ImportedArticle[] = [];

  // Basit eşzamanlılık havuzu.
  let cursor = 0;
  async function worker() {
    while (cursor < targets.length) {
      const url = targets[cursor++];
      const rss = rssByUrl.get(url);
      const page = await enrichFromPage(url);

      // Başlık: RSS'te varsa oradan, yoksa sayfadan (og:title, site eki temizli).
      const rawTitle = rss?.title || page.title || "";
      const title = decodeHtmlEntities(rawTitle)
        .replace(/\s*[-|–]\s*Son ?Bir ?Söz.*$/i, "")
        .trim();
      // İçerik önceliği: (1) RSS content:encoded (tam HTML), (2) sayfa JSON-LD
      // articleBody (sitemap-only haberler için), (3) spot'tan minimal gövde.
      const rawContent = rss?.content || "";
      const cleaned = rawContent ? cleanContentHtml(rawContent) : "";
      const spot =
        rss?.description?.slice(0, 300) || page.spot?.slice(0, 300) || null;

      const content = sanitizeArticleHtml(
        cleaned || page.bodyHtml || (spot ? `<p>${spot}</p>` : ""),
      );

      if (!title || !content) continue;

      results.push({
        title,
        slug: slugFromUrl(url, title),
        spot,
        content,
        coverImage: page.coverImage,
        coverImageAlt: page.coverImage ? title : null,
        categorySlug: page.categorySlug || classifyCategory(title, spot),
        sourceUrl: url,
        publishedAt:
          page.publishedAt ||
          (rss?.pubDate ? new Date(rss.pubDate) : null) ||
          new Date(),
      });
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, targets.length) }, () => worker()),
  );

  return results;
}

/** Okuma süresi tahmini (dk). */
export function estimateReadingTime(html: string): number {
  const words = stripHtml(html).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

// ─────────────────────────────────────────────────────────────────────
// ARŞİV MODU: aylık sitemap'lerden tüm geçmiş haber URL'lerini toplama ve
// verilen URL listesini (kaynağa yayılmış) zenginleştirerek makaleye çevirme.
// Büyük hacim (~24K) için batch + eşzamanlılık + hata toleransı esas alınır.
// ─────────────────────────────────────────────────────────────────────

/** Bir sitemap dosyasındaki <loc> URL'lerini döndür. */
async function fetchLocs(sitemapUrl: string): Promise<string[]> {
  try {
    const res = await fetch(sitemapUrl, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  } catch {
    return [];
  }
}

export interface ArchiveUrlOptions {
  /** Yalnız bu tarihten sonraki aylık sitemap'ler (YYYY-MM). Boşsa tümü. */
  since?: string;
  /** Toplanacak maksimum URL (0 = sınırsız). */
  max?: number;
}

/**
 * sitemap.xml index'inden tüm aylık haber sitemap'lerini bulur, her birindeki
 * haber URL'lerini toplayıp benzersiz, en yeni aydan eskiye sıralı liste döner.
 * `services.xml` ve `sitemap-news.xml` gibi haber-dışı/tekrar dosyaları atlar.
 */
export async function fetchSonbirsozArchiveUrls(
  opts: ArchiveUrlOptions = {},
): Promise<string[]> {
  const indexLocs = await fetchLocs(SONBIRSOZ_SITEMAP_INDEX);

  // Aylık haber sitemap'leri: /sitemap/sitemap-YYYY-MM.xml
  const monthly = indexLocs
    .filter((u) => /\/sitemap-\d{4}-\d{2}\.xml$/.test(u))
    .sort()
    .reverse(); // en yeni ay önce

  const filtered = opts.since
    ? monthly.filter((u) => {
        const m = u.match(/sitemap-(\d{4}-\d{2})\.xml/);
        return m ? m[1] >= opts.since! : true;
      })
    : monthly;

  const seen = new Set<string>();
  const urls: string[] = [];
  // Haber olmayan kategori/statik landing slug'ları (import edilmemeli).
  const NON_ARTICLE_SLUGS = new Set([
    "ekonomi", "gundem", "dunya", "saglik", "spor", "magazin", "teknoloji",
    "politika", "yasam", "kultur", "kultur-sanat", "borsa", "genel", "finans",
    "turkiye", "son-dakika", "haberler", "foto-galeri", "video-galeri",
    "yazarlar", "kunye", "iletisim", "hakkimizda", "reklam", "gizlilik",
    "kvkk", "sitemap", "arama", "rss",
  ]);
  for (const sm of filtered) {
    const locs = await fetchLocs(sm);
    for (const u of locs) {
      // Yalnız haber detay sayfaları: /slug (tek segment), sitemap/servis değil.
      if (!u.startsWith(BASE)) continue;
      if (u.includes("/sitemap") || u.includes("/rss")) continue;
      let path: string;
      try {
        path = new URL(u).pathname.replace(/^\/+|\/+$/g, "");
      } catch {
        continue;
      }
      if (!path || path.includes("/")) continue; // sadece tek segmentli slug
      if (NON_ARTICLE_SLUGS.has(path.toLowerCase())) continue; // kategori/statik
      if (seen.has(u)) continue;
      seen.add(u);
      urls.push(u);
      if (opts.max && urls.length >= opts.max) return urls;
    }
  }
  return urls;
}

export interface ByUrlOptions {
  concurrency?: number;
  /** İlerleme geri bildirimi (işlenen, toplam). */
  onProgress?: (done: number, total: number) => void;
}

/**
 * Verilen haber URL listesini (arşivden) zenginleştirerek ImportedArticle'a
 * çevirir. Her URL için sayfadan başlık/görsel/kategori/tarih/içerik çıkarılır.
 * RSS burada devrede değildir (arşiv haberleri RSS'te yok).
 */
export async function fetchSonbirsozArticlesByUrls(
  urls: string[],
  opts: ByUrlOptions = {},
): Promise<ImportedArticle[]> {
  const concurrency = opts.concurrency ?? 8;
  const results: ImportedArticle[] = [];
  let cursor = 0;
  let done = 0;

  async function worker() {
    while (cursor < urls.length) {
      const url = urls[cursor++];
      const page = await enrichFromPage(url);
      done++;
      if (opts.onProgress && done % 25 === 0) opts.onProgress(done, urls.length);

      const rawTitle = page.title || "";
      const title = rawTitle
        .replace(/\s*[-|–]\s*Son ?Bir ?Söz.*$/i, "")
        .trim();
      const spot = page.spot?.slice(0, 300) || null;
      // Bazı eski haberler yalnızca başlıktan oluşur (gövde/spot boş).
      // og:type=article ise başlık tek paragraf olarak içerik kabul edilir;
      // og:type=website (yazar profili vb.) sayfalar makale DEĞİLDİR, atlanır.
      const fallbackHtml =
        spot ? `<p>${spot}</p>`
        : page.ogType === "article" && title ? `<p>${title}</p>`
        : "";
      const content = sanitizeArticleHtml(page.bodyHtml || fallbackHtml);

      if (!title || !content) continue;
      if (page.ogType && page.ogType !== "article") continue;

      results.push({
        title,
        slug: slugFromUrl(url, title),
        spot,
        content,
        coverImage: page.coverImage,
        coverImageAlt: page.coverImage ? title : null,
        categorySlug: page.categorySlug || classifyCategory(title, spot),
        sourceUrl: url,
        publishedAt: page.publishedAt || new Date(),
      });
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, urls.length || 1) }, () =>
      worker(),
    ),
  );
  if (opts.onProgress) opts.onProgress(done, urls.length);

  return results;
}
