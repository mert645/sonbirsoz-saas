import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Clock, TrendingUp, Camera, Pen, Calendar } from "lucide-react";
import { SITE_NAME } from "@/lib/utils/constants";
import { HeroSlider } from "@/components/shared/hero-slider";
import { BreakingTicker } from "@/components/shared/breaking-ticker";
import { HoroscopeWidget } from "@/components/widgets/horoscope";
import { LeagueStandings } from "@/components/widgets/league-standings";
import { WeatherWidget } from "@/components/widgets/weather";
import { NewsletterForm } from "@/components/shared/newsletter-form";
import {
  getLatestArticles,
  getMostViewedArticles,
  getBreakingArticles,
  getFeaturedArticles,
  getArticlesForCategories,
  getYearAgoArticles,
} from "@/lib/data/articles";
import { getActiveAuthors } from "@/lib/data/authors";
import { formatRelativeTime } from "@/lib/utils/format";

export const metadata: Metadata = {
  title: `${SITE_NAME} — Tarafsız ve Güvenilir Haber`,
  description: "Türkiye ve dünyadan en güncel haberler. Gündem, politika, ekonomi, spor, teknoloji ve daha fazlası.",
};

export const revalidate = 60;

const HERO_SIDE = [
  { title: "Tanju Özcan hakkında 'nitelikli cinsel saldırı' soruşturması açıldı", slug: "gundem/tanju-ozcan-sorusturma", image: "https://images.unsplash.com/photo-1589994965851-a8f479c573a9?w=600&q=80", category: "Gündem", time: "30 dk önce" },
  { title: "Fenerbahçe'nin yeni başkanı Aziz Yıldırım mazbatasını aldı", slug: "spor/fenerbahce-aziz-yildirim", image: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=600&q=80", category: "Spor", time: "1 saat önce" },
  { title: "İran'dan İsrail'e balistik füze saldırısı: Bölgede alarm", slug: "dunya/iran-israil-fuze-saldirisi", image: "https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=600&q=80", category: "Dünya", time: "2 saat önce" },
  { title: "THY 9'uncu kez Türkiye'nin en değerli markası seçildi", slug: "ekonomi/thy-en-degerli-marka", image: "https://images.unsplash.com/photo-1542296332-2e4473faf563?w=600&q=80", category: "Ekonomi", time: "3 saat önce" },
];

const BREAKING = [
  "Mustafa Bozbey için 402 yıla kadar hapis istemi",
  "CHP'de 9 vekilin ihracı istendi",
  "İstanbul'da ormanlara girişler 15 Ekim'e kadar yasaklandı",
  "Merkez Bankası faiz oranını yüzde 37'de sabit tuttu",
  "Trump: İran müzakere etmekte geç kaldı",
];

const CATEGORIES = {
  gundem: {
    title: "Gündem",
    slug: "gundem",
    featured: { title: "Mustafa Bozbey için 402 yıla kadar hapis istemi", image: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&q=80", time: "1 saat önce" },
    items: [
      { title: "İstanbul merkezli 4 ilde uyuşturucu operasyonu: 110 gözaltı", time: "2 saat önce", image: "https://images.unsplash.com/photo-1453873531674-2151bcd01707?w=200&q=80" },
      { title: "Babasının aracına bombalı tuzak kuran sanığa ceza yağdı", time: "3 saat önce", image: "https://images.unsplash.com/photo-1589994965851-a8f479c573a9?w=200&q=80" },
      { title: "Eski belediye başkanına dolandırıcılıktan 60 yıl hapis", time: "4 saat önce", image: "https://images.unsplash.com/photo-1436450412740-6b988f486c6b?w=200&q=80" },
      { title: "Rahmi Koç'a soruşturma: Bakan Gürlek'ten açıklama geldi", time: "5 saat önce", image: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=200&q=80" },
    ],
  },
  ekonomi: {
    title: "Ekonomi",
    slug: "ekonomi",
    featured: { title: "Merkez Bankası faiz oranını yüzde 37'de sabit tuttu", image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&q=80", time: "2 saat önce" },
    items: [
      { title: "TÜİK: Aylık en yüksek reel getiri mevduat faizinde oldu", time: "3 saat önce", image: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=200&q=80" },
      { title: "Belirli şartları sağlayan yabancılar 20 yıl vergi ödemeyecek", time: "4 saat önce", image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=200&q=80" },
      { title: "TOKİ açık satış konut kampanyası: 10 soruda 10 cevap", time: "5 saat önce", image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=200&q=80" },
      { title: "İhracat rakamları açıklandı: Mayıs ayında yeni rekor", time: "6 saat önce", image: "https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=200&q=80" },
    ],
  },
  dunya: {
    title: "Dünya",
    slug: "dunya",
    featured: { title: "Trump: İran müzakere etmekte geç kaldı, bedelini ödeyecekler", image: "https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=600&q=80", time: "1 saat önce" },
    items: [
      { title: "ABD ordusu: İran'a yönelik saldırıları durdurduk", time: "3 saat önce", image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=200&q=80" },
      { title: "Şanlıurfa merkezli 21 ilde DEAŞ operasyonu: 47 gözaltı", time: "4 saat önce", image: "https://images.unsplash.com/photo-1580137189272-c9379f8864fd?w=200&q=80" },
      { title: "Vance: Diplomasi İsrail'in tutumuna bakılmaksızın sürecek", time: "5 saat önce", image: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=200&q=80" },
      { title: "Rusya-Ukrayna müzakereleri yeniden başlıyor", time: "6 saat önce", image: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=200&q=80" },
    ],
  },
  spor: {
    title: "Spor",
    slug: "spor",
    featured: { title: "Fenerbahçe'de başkan Aziz Yıldırım: Şampiyonluk özlemi bitiyor", image: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=600&q=80", time: "1 saat önce" },
    items: [
      { title: "Aziz Yıldırım: Takviyeleri 15 gün içinde yapacağız", time: "2 saat önce", image: "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=200&q=80" },
      { title: "Galatasaray'dan transfer bombası: Yıldız isim İstanbul'da", time: "3 saat önce", image: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=200&q=80" },
      { title: "A Milli Takım kadrosu açıklandı: Sürpriz isimler", time: "4 saat önce", image: "https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?w=200&q=80" },
      { title: "Beşiktaş'ta teknik direktör arayışı sürüyor", time: "5 saat önce", image: "https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=200&q=80" },
    ],
  },
  teknoloji: {
    title: "Teknoloji",
    slug: "teknoloji",
    featured: { title: "Apple Vision Pro Türkiye fiyatı ve satış tarihi açıklandı", image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&q=80", time: "1 saat önce" },
    items: [
      { title: "OpenAI yeni yapay zeka modeli GPT-5'i resmen tanıttı", time: "2 saat önce", image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=200&q=80" },
      { title: "Samsung Galaxy S25 serisi: Tüm özellikler sızdırıldı", time: "3 saat önce", image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=200&q=80" },
      { title: "Türk mühendislerden yerli uydu haberleşme sistemi", time: "4 saat önce", image: "https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=200&q=80" },
      { title: "Siber saldırılara karşı yeni güvenlik önlemleri", time: "5 saat önce", image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=200&q=80" },
    ],
  },
  saglik: {
    title: "Sağlık",
    slug: "saglik",
    featured: { title: "Dünyanın ilk 8'li çapraz karaciğer nakli Malatya'da yapıldı", image: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=600&q=80", time: "2 saat önce" },
    items: [
      { title: "Uzmanlardan yaz aylarında su tüketimine kritik uyarı", time: "3 saat önce", image: "https://images.unsplash.com/photo-1505576399279-565b52d4ac71?w=200&q=80" },
      { title: "Grip aşısı kampanyası başlıyor: Tarihler açıklandı", time: "4 saat önce", image: "https://images.unsplash.com/photo-1584515933487-779824d29309?w=200&q=80" },
      { title: "'Güneş koruyucu iki saatte bir yenilenmeli'", time: "5 saat önce", image: "https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=200&q=80" },
      { title: "Bakan Memişoğlu: 4 milyon sigara bırakma muayenesi yapıldı", time: "6 saat önce", image: "https://images.unsplash.com/photo-1559757175-5700dde675bc?w=200&q=80" },
    ],
  },
};

const TRENDING = [
  { title: "Rahmi Koç'a soruşturma açıldı! Bakan Gürlek'ten açıklama", rank: 1 },
  { title: "Mustafa Bozbey için 402 yıla kadar hapis istemi", rank: 2 },
  { title: "Fenerbahçe'nin yeni başkanı Aziz Yıldırım oldu", rank: 3 },
  { title: "CHP'de 9 vekilin ihracı istendi", rank: 4 },
  { title: "İran'dan İsrail'e füze saldırısı: Gerilim tırmanıyor", rank: 5 },
  { title: "Merkez Bankası faiz kararını açıkladı", rank: 6 },
  { title: "Apple Vision Pro Türkiye'ye geliyor", rank: 7 },
  { title: "İstanbul'da ormanlara giriş yasaklandı", rank: 8 },
  { title: "THY en değerli marka seçildi", rank: 9 },
  { title: "Galatasaray'dan sürpriz transfer hamlesi", rank: 10 },
];

const KULTUR_SANAT = {
  featured: { title: "Frankfurt Türk Film Festivali'nde 'Madelet' belgeselinin özel gösterimi yapılacak", image: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&q=80", spot: "Türk havacılık tarihine adını yazdırmış ilk kadın pilotun hikayesi Almanya'da seyirciyle buluşuyor." },
  items: [
    { title: "800 kişilik Bilfen Filarmoni Orkestrası, Levent Yüksel ile konser verdi", time: "5 saat önce" },
    { title: "'Kuğu Gölü' balesi AKM'de ayakta alkışlandı", time: "8 saat önce" },
    { title: "7. İstanbul Uluslararası Bale Yarışması ödülleri sahiplerini buldu", time: "12 saat önce" },
    { title: "Sezai Karakoç'un arşivi, 'Zamana Adanmış Sözler' sergisiyle ilk kez ortaya çıktı", time: "1 gün önce" },
  ],
};

const YASAM = [
  { title: "Yaren leyleğin eşi Nazlı, 5 yıl aradan sonra balıkçı Adem'in kayığına kondu", image: "https://images.unsplash.com/photo-1551085254-e96b210db58a?w=400&q=80" },
  { title: "Tuz Gölü'nde 5 bin yavru flamingo kuluçkadan çıktı", image: "https://images.unsplash.com/photo-1497206365907-f5e630693df0?w=400&q=80" },
  { title: "Türkiye'nin ilk robot tiyatrosu 'Neci'nin Diji Maceraları' tanıtıldı", image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=400&q=80" },
  { title: "Balık göçünü bayram tatilinde 40 bin kişi izledi", image: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&q=80" },
];

const FOTO_GALERI = [
  { title: "Yaz Sıcaklarında Su İhtiyacınızı Karşılayan Doğal Gıdalar", image: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=600&q=80" },
  { title: "Balkanların Vizesiz Cenneti: Karadağ", image: "https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?w=600&q=80" },
  { title: "Nemrut Kalderası Milli Park Oluyor", image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&q=80" },
  { title: "Modern Zamanın Sessiz Salgını: Tükenmişlik", image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&q=80" },
];

const YAZARLAR = [
  { name: "Ahmet Yılmaz", title: "Yapay Zekâ Çağında Doğal Güzelliğin Yeni Dönemi", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&q=80" },
  { name: "Fatma Demir", title: "Türkiye'de Sporun Geleceği: Sistemli Altyapı Şart!", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80" },
  { name: "Mehmet Kaya", title: "Melek Devlet, Kayıp Fikirler: Fonları Harekete Geçirme Zamanı", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80" },
  { name: "Elif Öztürk", title: "Acımız ve Sorumluluğumuz: Gençlerin Kalbi Neden Isınmıyor?", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80" },
];

const GECEN_YIL = [
  { title: "Tahran'da Kaos: Halk Şehri Terk Ediyor", time: "16 Haziran 2025" },
  { title: "Netanyahu: Tahran'ı Boşaltın, Harekete Geçiyoruz", time: "16 Haziran 2025" },
  { title: "Manisa'da Belediye Başkanlığına Kim Seçildi? İşte Resmi Sonuç", time: "16 Haziran 2025" },
  { title: "İran'dan İsrail'e Yeni Füze Saldırısı: Ordu Resmi Açıklama Yaptı", time: "16 Haziran 2025" },
];

export default async function HomePage() {
  // Pull live content where available; gracefully keep curated fallbacks
  // for a fresh (empty) database so the page always looks complete.
  const HOME_CATEGORY_SLUGS = ["gundem", "ekonomi", "dunya", "spor", "teknoloji", "saglik"];

  const [latest, mostViewed, breakingReal, featuredReal, categoryArticles, activeAuthors, yearAgoReal] = await Promise.all([
    getLatestArticles(8),
    getMostViewedArticles(10),
    getBreakingArticles(6),
    getFeaturedArticles(3),
    getArticlesForCategories(HOME_CATEGORY_SLUGS, 5),
    getActiveAuthors(4),
    getYearAgoArticles(4),
  ]);

  const heroSide =
    latest.length >= 4
      ? latest.slice(0, 4).map((a) => ({
          title: a.title,
          slug: `${a.category.slug}/${a.slug}`,
          image:
            a.coverImage ||
            "https://images.unsplash.com/photo-1495020689067-958852a7765e?w=600&q=80",
          category: a.category.name,
          time: formatRelativeTime(a.publishedAt ?? new Date()),
        }))
      : HERO_SIDE;

  const breaking =
    breakingReal.length > 0
      ? breakingReal.map((a) => ({
          text: a.title,
          href: `/${a.category.slug}/${a.slug}`,
          critical: true,
        }))
      : latest.length > 0
        ? latest.slice(0, 5).map((a) => ({
            text: a.title,
            href: `/${a.category.slug}/${a.slug}`,
            critical: false,
          }))
        : BREAKING.map((text) => ({ text, href: null, critical: false }));

  const trending =
    mostViewed.length > 0
      ? mostViewed.map((a, i) => ({
          title: a.title,
          rank: i + 1,
          href: `/${a.category.slug}/${a.slug}`,
        }))
      : TRENDING.map((t) => ({ ...t, href: "#" }));

  // Editor's Pick: sadece gerçek featured haberler — mock yok
  const editorsPick = featuredReal.slice(0, 3).map((a) => ({
    title: a.title,
    slug: `${a.category.slug}/${a.slug}`,
    image:
      a.coverImage ||
      "https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&q=80",
    category: a.category.name,
    spot: a.spot ?? "",
  }));

  // Build category card data — use real articles when available, else mock
  const buildCategoryCard = (
    slug: keyof typeof CATEGORIES,
    dbArticles: typeof categoryArticles[string]
  ) => {
    const mock = CATEGORIES[slug];
    if (!dbArticles || dbArticles.length < 2) return mock;
    const [first, ...rest] = dbArticles;
    return {
      ...mock,
      featured: {
        title: first.title,
        image:
          first.coverImage ||
          "https://images.unsplash.com/photo-1495020689067-958852a7765e?w=600&q=80",
        time: formatRelativeTime(first.publishedAt ?? new Date()),
        slug: `${first.category.slug}/${first.slug}`,
      },
      items: rest.slice(0, 4).map((a) => ({
        title: a.title,
        time: formatRelativeTime(a.publishedAt ?? new Date()),
        image:
          a.coverImage ||
          "https://images.unsplash.com/photo-1495020689067-958852a7765e?w=200&q=80",
        slug: `${a.category.slug}/${a.slug}`,
      })),
    };
  };

  const categoryCards = {
    gundem: buildCategoryCard("gundem", categoryArticles["gundem"]),
    ekonomi: buildCategoryCard("ekonomi", categoryArticles["ekonomi"]),
    dunya: buildCategoryCard("dunya", categoryArticles["dunya"]),
    spor: buildCategoryCard("spor", categoryArticles["spor"]),
    teknoloji: buildCategoryCard("teknoloji", categoryArticles["teknoloji"]),
    saglik: buildCategoryCard("saglik", categoryArticles["saglik"]),
  };

  // Authors section
  const yazarlar =
    activeAuthors.length >= 2
      ? activeAuthors.slice(0, 4).map((a) => ({
          name: a.name,
          title: a.bio ?? a.expertise[0] ?? "",
          avatar:
            a.avatar ||
            "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&q=80",
          slug: a.slug,
        }))
      : YAZARLAR.map((y) => ({ ...y, slug: "#" }));

  // Geçen Yıl Bugün
  const yearAgo = new Date();
  yearAgo.setFullYear(yearAgo.getFullYear() - 1);
  const gecenYilLabel = yearAgo.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const gecenYil =
    yearAgoReal.length >= 2
      ? yearAgoReal.map((a) => ({
          title: a.title,
          time: new Date(a.publishedAt ?? new Date()).toLocaleDateString(
            "tr-TR",
            { day: "numeric", month: "long", year: "numeric" }
          ),
          slug: `${a.category.slug}/${a.slug}`,
        }))
      : GECEN_YIL.map((g) => ({ ...g, slug: "#" }));

  const heroSlides =
    latest.length >= 4
      ? latest.slice(0, 5).map((a) => ({
          title: a.title,
          slug: `${a.category.slug}/${a.slug}`,
          spot: a.spot ?? "",
          image:
            a.coverImage ||
            "https://images.unsplash.com/photo-1495020689067-958852a7765e?w=1200&q=80",
          category: a.category.name,
          time: formatRelativeTime(a.publishedAt ?? new Date()),
        }))
      : undefined;

  return (
    <main className="animate-fade-in">
      {/* Breaking Ticker */}
      {/* Canlı Son Dakika şeridi — 5 dk'da bir /api/breaking'den tazelenir */}
      <BreakingTicker initialItems={breaking} />

      <div className="mx-auto max-w-[1200px] px-5">
        {/* Hero Section */}
        <section className="py-5">
          <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
            <HeroSlider slides={heroSlides} />
            <div className="flex flex-col divide-y divide-border">
              {heroSide.map((item, i) => (
                <Link key={i} href={`/${item.slug}`} className="group flex gap-4 py-3.5 first:pt-0 last:pb-0">
                  <div className="relative h-[80px] w-[120px] shrink-0 overflow-hidden rounded-md">
                    <Image src={item.image} alt={item.title} fill className="object-cover transition-transform duration-300 group-hover:scale-105" sizes="120px" />
                  </div>
                  <div className="flex flex-1 flex-col justify-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">{item.category}</span>
                    <h3 className="mt-1 line-clamp-2 text-[14px] font-semibold leading-[1.4] text-foreground group-hover:text-primary transition-colors">{item.title}</h3>
                    <span className="mt-1.5 text-[11px] text-muted-foreground">{item.time}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Servisler (Tools) */}
        <section className="border-t py-6">
          <div className="flex items-center gap-6 overflow-x-auto pb-1 scrollbar-hide">
            <span className="shrink-0 text-[12px] font-bold uppercase tracking-wide text-muted-foreground">Servisler</span>
            <div className="h-4 w-px bg-border" />
            <Link href="/servisler/nobetci-eczane" className="group flex shrink-0 items-center gap-2 rounded-full border border-border bg-card px-4 py-2 transition-all hover:border-primary/50 hover:shadow-sm">
              <span className="text-[16px]">💊</span>
              <span className="text-[12px] font-semibold text-foreground group-hover:text-primary">Nöbetçi Eczane</span>
            </Link>
            <Link href="/servisler/doviz" className="group flex shrink-0 items-center gap-2 rounded-full border border-border bg-card px-4 py-2 transition-all hover:border-primary/50 hover:shadow-sm">
              <span className="text-[16px]">💱</span>
              <span className="text-[12px] font-semibold text-foreground group-hover:text-primary">Döviz Çevirici</span>
            </Link>
            <Link href="/servisler/namaz-vakitleri" className="group flex shrink-0 items-center gap-2 rounded-full border border-border bg-card px-4 py-2 transition-all hover:border-primary/50 hover:shadow-sm">
              <span className="text-[16px]">🕌</span>
              <span className="text-[12px] font-semibold text-foreground group-hover:text-primary">Namaz Vakitleri</span>
            </Link>
            <Link href="/servisler/altin-fiyatlari" className="group flex shrink-0 items-center gap-2 rounded-full border border-border bg-card px-4 py-2 transition-all hover:border-primary/50 hover:shadow-sm">
              <span className="text-[16px]">🥇</span>
              <span className="text-[12px] font-semibold text-foreground group-hover:text-primary">Altın Fiyatları</span>
            </Link>
            <Link href="/servisler/tv-rehberi" className="group flex shrink-0 items-center gap-2 rounded-full border border-border bg-card px-4 py-2 transition-all hover:border-primary/50 hover:shadow-sm">
              <span className="text-[16px]">📺</span>
              <span className="text-[12px] font-semibold text-foreground group-hover:text-primary">TV Rehberi</span>
            </Link>
            <Link href="/servisler/hava-durumu" className="group flex shrink-0 items-center gap-2 rounded-full border border-border bg-card px-4 py-2 transition-all hover:border-primary/50 hover:shadow-sm">
              <span className="text-[16px]">⛅</span>
              <span className="text-[12px] font-semibold text-foreground group-hover:text-primary">Hava Durumu</span>
            </Link>
          </div>
        </section>

        {/* Editor's Pick */}
        {editorsPick.length > 0 && (
        <section className="border-t py-7">
          <div className="mb-5 flex items-center gap-3">
            <h2 className="text-[15px] font-bold uppercase tracking-wide text-foreground">Editörün Seçimi</h2>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {editorsPick.map((item, i) => (
              <Link key={i} href={`/${item.slug}`} className="group">
                <div className="relative aspect-[16/9] overflow-hidden rounded-lg">
                  <Image src={item.image} alt={item.title} fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="(max-width: 640px) 100vw, 33vw" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <span className="absolute bottom-3 left-3 text-[10px] font-bold uppercase tracking-wider text-white/90">{item.category}</span>
                </div>
                <h3 className="mt-3 line-clamp-2 text-[15px] font-bold leading-[1.4] text-foreground group-hover:text-primary transition-colors">{item.title}</h3>
                <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">{item.spot}</p>
              </Link>
            ))}
          </div>
        </section>
        )}

        {/* Main Content: Categories + Sidebar */}
        <section className="grid gap-10 border-t py-8 lg:grid-cols-[1fr_300px]">
          {/* Categories */}
          <div className="space-y-8">
            {/* Row 1: Gündem + Ekonomi */}
            <div className="grid gap-8 md:grid-cols-2">
              <CategoryCard data={categoryCards.gundem} />
              <CategoryCard data={categoryCards.ekonomi} />
            </div>
            {/* Row 2: Dünya + Spor */}
            <div className="grid gap-8 md:grid-cols-2">
              <CategoryCard data={categoryCards.dunya} />
              <CategoryCard data={categoryCards.spor} />
            </div>
            {/* Row 3: Teknoloji + Sağlık */}
            <div className="grid gap-8 md:grid-cols-2">
              <CategoryCard data={categoryCards.teknoloji} />
              <CategoryCard data={categoryCards.saglik} />
            </div>
          </div>

          {/* Sidebar */}
          <aside className="space-y-8">
            {/* Trending */}
            <div>
              <div className="mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <h3 className="text-[13px] font-bold uppercase tracking-wide">Çok Okunanlar</h3>
              </div>
              <div className="divide-y divide-border">
                {trending.map((t) => (
                  <Link key={t.rank} href={t.href} className="group flex items-start gap-3 py-2.5">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-primary/10 text-[11px] font-bold text-primary">{t.rank}</span>
                    <p className="line-clamp-2 text-[13px] font-medium leading-snug text-foreground group-hover:text-primary transition-colors">{t.title}</p>
                  </Link>
                ))}
              </div>
            </div>

            <div className="h-px bg-border" />
            <WeatherWidget />
            <div className="h-px bg-border" />
            <LeagueStandings />
            <div className="h-px bg-border" />
            <HoroscopeWidget />
          </aside>
        </section>

        {/* Kültür & Sanat + Yaşam */}
        <section className="border-t py-8">
          <div className="grid gap-10 lg:grid-cols-[1fr_1fr]">
            {/* Kültür & Sanat */}
            <div>
              <div className="mb-4 flex items-center gap-3">
                <h2 className="text-[14px] font-bold uppercase tracking-wide">Kültür & Sanat</h2>
                <div className="h-px flex-1 bg-border" />
                <Link href="/kultur" className="text-[11px] font-medium text-primary hover:underline">Tümü →</Link>
              </div>
              <Link href="#" className="group mb-4 block">
                <div className="relative aspect-[16/9] overflow-hidden rounded-lg">
                  <Image src={KULTUR_SANAT.featured.image} alt={KULTUR_SANAT.featured.title} fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="500px" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="text-[15px] font-bold leading-snug text-white">{KULTUR_SANAT.featured.title}</h3>
                    <p className="mt-1 text-[12px] text-white/70 line-clamp-2">{KULTUR_SANAT.featured.spot}</p>
                  </div>
                </div>
              </Link>
              <div className="divide-y divide-border/70">
                {KULTUR_SANAT.items.map((item, i) => (
                  <Link key={i} href="#" className="group flex items-baseline gap-2 py-2">
                    <span className="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-primary/60" />
                    <p className="flex-1 text-[13px] font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">{item.title}</p>
                  </Link>
                ))}
              </div>
            </div>

            {/* Yaşam */}
            <div>
              <div className="mb-4 flex items-center gap-3">
                <h2 className="text-[14px] font-bold uppercase tracking-wide">Yaşam</h2>
                <div className="h-px flex-1 bg-border" />
                <Link href="/yasam" className="text-[11px] font-medium text-primary hover:underline">Tümü →</Link>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {YASAM.map((item, i) => (
                  <Link key={i} href="#" className="group">
                    <div className="relative aspect-[4/3] overflow-hidden rounded-md">
                      <Image src={item.image} alt={item.title} fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="250px" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                      <p className="absolute bottom-0 left-0 right-0 p-3 text-[12px] font-semibold leading-snug text-white line-clamp-2">{item.title}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Foto Galeri */}
        <section className="border-t py-8">
          <div className="mb-5 flex items-center gap-3">
            <Camera className="h-4 w-4 text-primary" />
            <h2 className="text-[14px] font-bold uppercase tracking-wide">Foto Galeri</h2>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FOTO_GALERI.map((item, i) => (
              <Link key={i} href="#" className="group relative aspect-[4/3] overflow-hidden rounded-lg">
                <Image src={item.image} alt={item.title} fill className="object-cover transition-transform duration-500 group-hover:scale-110" sizes="300px" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <div className="mb-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                    <Camera className="h-3 w-3 text-white" />
                  </div>
                  <p className="text-[12px] font-semibold leading-snug text-white line-clamp-2">{item.title}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Yazarlar */}
        <section className="border-t py-8">
          <div className="mb-5 flex items-center gap-3">
            <Pen className="h-4 w-4 text-primary" />
            <h2 className="text-[14px] font-bold uppercase tracking-wide">Yazarlar</h2>
            <div className="h-px flex-1 bg-border" />
            <Link href="/yazarlar" className="text-[11px] font-medium text-primary hover:underline">Tümü →</Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {yazarlar.map((yazar, i) => (
              <Link key={i} href={yazar.slug !== "#" ? `/yazar/${yazar.slug}` : "#"} className="group flex items-start gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-muted/50">
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full">
                  <Image src={yazar.avatar} alt={yazar.name} fill className="object-cover" sizes="40px" />
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-bold text-foreground">{yazar.name}</p>
                  <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground group-hover:text-foreground transition-colors line-clamp-2">{yazar.title}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Geçen Yıl Bugün */}
        <section className="border-t py-8">
          <div className="mb-5 flex items-center gap-3">
            <Calendar className="h-4 w-4 text-primary" />
            <h2 className="text-[14px] font-bold uppercase tracking-wide">Geçen Yıl Bugün</h2>
            <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">{gecenYilLabel}</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {gecenYil.map((item, i) => (
              <Link key={i} href={item.slug !== "#" ? `/${item.slug}` : "#"} className="group rounded-lg bg-muted/50 p-4 transition-colors hover:bg-muted dark:bg-muted/30 dark:hover:bg-muted/50">
                <p className="text-[13px] font-semibold leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2">{item.title}</p>
                <span className="mt-2 block text-[10px] text-muted-foreground">{item.time}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Newsletter */}
        <section className="mb-8 border-t py-8">
          <div className="flex flex-col items-center gap-4 text-center md:flex-row md:text-left md:gap-8">
            <div className="flex-1">
              <h2 className="text-[18px] font-bold">Günlük Haber Bülteni</h2>
              <p className="mt-1 text-[13px] text-muted-foreground">Günün en önemli gelişmelerini her sabah e-postanızda bulun. 50.000+ abone.</p>
            </div>
            <NewsletterForm />
          </div>
        </section>
      </div>
    </main>
  );
}

interface CategoryData {
  title: string;
  slug: string;
  featured: { title: string; image: string; time: string; slug?: string };
  items: { title: string; time: string; image: string; slug?: string }[];
}

function CategoryCard({ data }: { data: CategoryData }) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <h2 className="text-[14px] font-bold uppercase tracking-wide text-foreground">{data.title}</h2>
        <div className="h-px flex-1 bg-border" />
        <Link href={`/${data.slug}`} className="text-[11px] font-medium text-primary hover:underline">
          Tümü →
        </Link>
      </div>

      {/* Featured article with image */}
      <Link href={data.featured.slug ? `/${data.featured.slug}` : "#"} className="group mb-3 block">
        <div className="relative aspect-[16/9] overflow-hidden rounded-md">
          <Image src={data.featured.image} alt={data.featured.title} fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="(max-width: 768px) 100vw, 400px" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="text-[15px] font-bold leading-snug text-white group-hover:underline decoration-white/50">{data.featured.title}</h3>
            <span className="mt-1.5 flex items-center gap-1 text-[11px] text-white/60"><Clock className="h-3 w-3" />{data.featured.time}</span>
          </div>
        </div>
      </Link>

      {/* List with thumbnails */}
      <div className="divide-y divide-border/70">
        {data.items.map((item, i) => (
          <Link key={i} href={item.slug ? `/${item.slug}` : "#"} className="group flex items-center gap-3 py-2.5">
            <div className="relative h-[48px] w-[68px] shrink-0 overflow-hidden rounded">
              <Image src={item.image} alt={item.title} fill className="object-cover" sizes="68px" />
            </div>
            <p className="flex-1 text-[13px] font-medium leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2">{item.title}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
