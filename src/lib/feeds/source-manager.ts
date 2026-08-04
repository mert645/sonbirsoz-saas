export interface RSSSourceConfig {
  name: string;
  url: string;
  category: string;
  priority: number;
}

export const DEFAULT_RSS_SOURCES: RSSSourceConfig[] = [
  {
    name: "Son Bir Söz - Tüm Haberler",
    url: "https://www.sonbirsoz.com/rss/1",
    category: "gundem",
    priority: 1,
  },
  {
    name: "Anadolu Ajansı - Gündem",
    url: "https://www.aa.com.tr/tr/rss/default?cat=guncel",
    category: "gundem",
    priority: 1,
  },
  {
    name: "Anadolu Ajansı - Ekonomi",
    url: "https://www.aa.com.tr/tr/rss/default?cat=ekonomi",
    category: "ekonomi",
    priority: 1,
  },
  {
    name: "Anadolu Ajansı - Spor",
    url: "https://www.aa.com.tr/tr/rss/default?cat=spor",
    category: "spor",
    priority: 1,
  },
  {
    name: "Anadolu Ajansı - Dünya",
    url: "https://www.aa.com.tr/tr/rss/default?cat=dunya",
    category: "dunya",
    priority: 1,
  },
  {
    name: "Anadolu Ajansı - Teknoloji",
    url: "https://www.aa.com.tr/tr/rss/default?cat=bilim-teknoloji",
    category: "teknoloji",
    priority: 1,
  },
  {
    name: "NTV - Son Dakika",
    url: "https://www.ntv.com.tr/son-dakika.rss",
    category: "gundem",
    priority: 2,
  },
  {
    name: "NTV - Ekonomi",
    url: "https://www.ntv.com.tr/ekonomi.rss",
    category: "ekonomi",
    priority: 2,
  },
  {
    name: "TRT Haber - Gündem",
    url: "https://www.trthaber.com/sondakika.rss",
    category: "gundem",
    priority: 2,
  },
];

export function getActiveSourcesByCategory(category?: string): RSSSourceConfig[] {
  let sources = [...DEFAULT_RSS_SOURCES];
  if (category) {
    sources = sources.filter((s) => s.category === category);
  }
  return sources.sort((a, b) => a.priority - b.priority);
}

export function getSourceUrls(category?: string): string[] {
  return getActiveSourcesByCategory(category).map((s) => s.url);
}
