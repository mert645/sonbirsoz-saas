import { SITE_NAME, SITE_URL } from "@/lib/utils/constants";

export function generateOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "NewsMediaOrganization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    description:
      "Tarafsız ve güvenilir haberin adresi. Gündem, politika, ekonomi, dünya, spor, teknoloji haberleri.",
    sameAs: [
      "https://twitter.com/sonbirsoz",
      "https://instagram.com/sonbirsoz",
      "https://youtube.com/@sonbirsoz",
      "https://t.me/sonbirsoz",
    ],
    foundingDate: "2024",
  };
}

export function generateNewsArticleJsonLd(article: {
  title: string;
  description: string;
  url: string;
  image: string;
  publishedAt: string;
  updatedAt: string;
  authorName: string;
  authorUrl: string;
  categoryName: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": article.url,
    },
    headline: article.title,
    description: article.description,
    image: {
      "@type": "ImageObject",
      url: article.image,
      width: 1200,
      height: 675,
    },
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    author: {
      "@type": "Person",
      name: article.authorName,
      url: article.authorUrl,
    },
    publisher: {
      "@type": "NewsMediaOrganization",
      name: SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/logo.png`,
        width: 200,
        height: 60,
      },
    },
    articleSection: article.categoryName,
    isAccessibleForFree: true,
    inLanguage: "tr-TR",
    // Sesli asistanlar (Google Assistant vb.) için okunabilir bölümler
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: ["h1", ".article-spot"],
    },
  };
}

export function generateBreadcrumbJsonLd(
  items: { name: string; url: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
