/**
 * Hazır tema presetleri
 */

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  primaryColor: string;
  category: "news" | "magazine" | "tech" | "sports" | "entertainment" | "business";
}

export const THEME_PRESETS: ThemePreset[] = [
  // Haber Siteleri
  {
    id: "classic-red",
    name: "Klasik Kırmızı",
    description: "Geleneksel haber sitesi görünümü",
    primaryColor: "#DC2626",
    category: "news",
  },
  {
    id: "modern-blue",
    name: "Modern Mavi",
    description: "Güvenilir ve profesyonel",
    primaryColor: "#2563EB",
    category: "news",
  },
  {
    id: "dark-slate",
    name: "Koyu Arduvaz",
    description: "Ciddi ve sofistike",
    primaryColor: "#475569",
    category: "news",
  },

  // Magazin
  {
    id: "vibrant-pink",
    name: "Canlı Pembe",
    description: "Eğlenceli ve dikkat çekici",
    primaryColor: "#EC4899",
    category: "magazine",
  },
  {
    id: "royal-purple",
    name: "Kraliyet Moru",
    description: "Lüks ve şık",
    primaryColor: "#7C3AED",
    category: "magazine",
  },
  {
    id: "sunset-orange",
    name: "Gün Batımı",
    description: "Sıcak ve davetkar",
    primaryColor: "#F97316",
    category: "entertainment",
  },

  // Teknoloji
  {
    id: "tech-cyan",
    name: "Teknoloji Mavisi",
    description: "Yenilikçi ve modern",
    primaryColor: "#06B6D4",
    category: "tech",
  },
  {
    id: "neon-green",
    name: "Neon Yeşil",
    description: "Enerjik ve dinamik",
    primaryColor: "#22C55E",
    category: "tech",
  },
  {
    id: "deep-indigo",
    name: "Derin İndigo",
    description: "Profesyonel teknoloji",
    primaryColor: "#4F46E5",
    category: "tech",
  },

  // Spor
  {
    id: "sports-green",
    name: "Spor Yeşili",
    description: "Enerjik ve dinamik",
    primaryColor: "#10B981",
    category: "sports",
  },
  {
    id: "champion-gold",
    name: "Şampiyon Altını",
    description: "Zafer ve başarı",
    primaryColor: "#F59E0B",
    category: "sports",
  },
  {
    id: "team-navy",
    name: "Takım Laciverti",
    description: "Güçlü ve kararlı",
    primaryColor: "#1E3A8A",
    category: "sports",
  },

  // İş/Finans
  {
    id: "corporate-teal",
    name: "Kurumsal Turkuaz",
    description: "Profesyonel ve güvenilir",
    primaryColor: "#0D9488",
    category: "business",
  },
  {
    id: "finance-emerald",
    name: "Finans Zümrüdü",
    description: "Büyüme ve refah",
    primaryColor: "#059669",
    category: "business",
  },
  {
    id: "executive-gray",
    name: "Yönetici Grisi",
    description: "Ciddi ve profesyonel",
    primaryColor: "#6B7280",
    category: "business",
  },
];

export const PRESET_CATEGORIES = [
  { id: "news", name: "Haber" },
  { id: "magazine", name: "Magazin" },
  { id: "tech", name: "Teknoloji" },
  { id: "sports", name: "Spor" },
  { id: "entertainment", name: "Eğlence" },
  { id: "business", name: "İş/Finans" },
];

export function getPresetsByCategory(category: string): ThemePreset[] {
  return THEME_PRESETS.filter((preset) => preset.category === category);
}

export function getPresetById(id: string): ThemePreset | undefined {
  return THEME_PRESETS.find((preset) => preset.id === id);
}
