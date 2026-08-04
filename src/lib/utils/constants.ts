export const SITE_NAME = "Son Bir Söz";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.sonbirsoz.com";
export const SITE_DESCRIPTION = "Tarafsız ve güvenilir haberin adresi. Gündem, politika, ekonomi, dünya, spor, teknoloji ve daha fazlası.";

export const CATEGORIES = [
  { name: "Gündem", slug: "gundem", color: "#EF4444" },
  { name: "Politika", slug: "politika", color: "#8B5CF6" },
  { name: "Ekonomi", slug: "ekonomi", color: "#10B981" },
  { name: "Dünya", slug: "dunya", color: "#3B82F6" },
  { name: "Spor", slug: "spor", color: "#F59E0B" },
  { name: "Teknoloji", slug: "teknoloji", color: "#06B6D4" },
  { name: "Sağlık", slug: "saglik", color: "#EC4899" },
  { name: "Yaşam", slug: "yasam", color: "#84CC16" },
  { name: "Magazin", slug: "magazin", color: "#F97316" },
  { name: "Finans", slug: "finans", color: "#14B8A6" },
  { name: "Özel Haber", slug: "ozel-haber", color: "#DC2626" },
  { name: "Analiz", slug: "analiz", color: "#7C3AED" },
] as const;

export const NAV_ITEMS = CATEGORIES.slice(0, 8);

export const SOCIAL_LINKS = {
  twitter: "https://twitter.com/sonbirsoz",
  instagram: "https://instagram.com/sonbirsoz",
  youtube: "https://youtube.com/@sonbirsoz",
  telegram: "https://t.me/sonbirsoz",
} as const;
