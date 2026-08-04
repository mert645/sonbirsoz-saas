import sanitizeHtml from "sanitize-html";

// Haber gövdesi için güvenli, allow-list tabanlı HTML sanitizasyonu.
// Dış kaynaklardan (RSS/scrape) veya editörden gelen içerik, okuyucuya
// dangerouslySetInnerHTML ile basılmadan ÖNCE mutlaka buradan geçmelidir.
// Regex tabanlı temizlik yeterli değildir; sanitize-html tarayıcı-uyumlu bir
// parser ile çalışır ve kodlanmış/gizlenmiş XSS vektörlerini de eler.

const ALLOWED_TAGS = [
  "p", "br", "hr", "blockquote", "pre", "code",
  "h2", "h3", "h4", "h5", "h6",
  "strong", "b", "em", "i", "u", "s", "mark", "small", "sub", "sup",
  "ul", "ol", "li",
  "a", "img", "figure", "figcaption",
  "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption",
  "span", "div",
];

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title", "width", "height", "loading"],
    "*": ["class"],
  },
  // Yalnız güvenli şemalar; javascript:, data: (img hariç) engellenir.
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesByTag: { img: ["http", "https"] },
  allowProtocolRelative: false,
  // Dış linkleri güvenli hale getir.
  transformTags: {
    a: (tagName, attribs) => {
      const isExternal = /^https?:\/\//i.test(attribs.href ?? "");
      return {
        tagName: "a",
        attribs: {
          ...attribs,
          ...(isExternal
            ? { target: "_blank", rel: "noopener noreferrer nofollow" }
            : {}),
        },
      };
    },
  },
  // İçi boş bırakılabilecek anlamlı etiketleri koru.
  nonTextTags: ["style", "script", "textarea", "option", "noscript"],
};

/** Haber/makale gövdesini güvenli HTML'e indirger. */
export function sanitizeArticleHtml(html: string | null | undefined): string {
  if (!html) return "";
  return sanitizeHtml(html, SANITIZE_OPTIONS);
}
