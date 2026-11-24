/**
 * C3 — Marka Kartı (Brand Card)
 *
 * Her marka için standart sosyal medya kartı üretir:
 *   - Üst sol: marka etiket (cardLabel) — marka rengiyle
 *   - Merkez: haber başlığı
 *   - Alt: "sonbirsoz.com · Son Bir Söz <Marka>"
 *   - Kapak görseli varsa arka plan olarak kullanılır (koyu overlay)
 *
 * Çıktı: SVG string (tarayıcıda önizleme) veya
 *        base64 PNG (SSM card API mevcut değilse SVG data URI)
 *
 * Telif kontrolü: ajans domain'i içeren görsel URL'leri bu fonksiyon reddeder;
 * imageUrl null gelirse düz renkli arka plan kullanılır.
 */

export interface BrandCardOptions {
  title: string;           // haber başlığı
  cardLabel: string;       // "SPOR", "ASAYİŞ", "MAGAZİN" ...
  brandName: string;       // "Son Bir Söz Spor"
  brandColor: string;      // "#16A34A"
  imageUrl?: string | null; // kapak görseli (telif kontrolü yapılır)
  format?: "square" | "story"; // 1:1 veya 9:16 (varsayılan: square)
}

export interface BrandCardResult {
  svgDataUri: string;   // data:image/svg+xml;base64,...
  width: number;
  height: number;
  usedImage: boolean;   // telif geçtiyse true
}

// Ajans domain'leri — bu domain'lerden gelen görseller kart arkaplanı olarak kullanılmaz
const AGENCY_DOMAINS = [
  "aa.com.tr", "dha.com.tr", "iha.com.tr",
  "hurriyet.com.tr", "milliyet.com.tr", "sabah.com.tr",
  "sozcu.com.tr", "cumhuriyet.com.tr",
];

function isAgencyUrl(url: string): boolean {
  if (!url) return false;
  return AGENCY_DOMAINS.some((d) => url.includes(d));
}

/** Hex rengi HEX → RGB dönüşümü (SVG rgba için) */
function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

/** Uzun başlıkları satırlara böler (SVG'de otomatik satır sonu yok) */
function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if ((current + " " + word).trim().length <= maxCharsPerLine) {
      current = (current + " " + word).trim();
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 4); // maksimum 4 satır
}

export function generateBrandCardSvg(opts: BrandCardOptions): BrandCardResult {
  const isStory = opts.format === "story";
  const width = 1080;
  const height = isStory ? 1920 : 1080;

  const safeImageUrl = opts.imageUrl && !isAgencyUrl(opts.imageUrl) ? opts.imageUrl : null;
  const usedImage = !!safeImageUrl;

  const [r, g, b] = hexToRgb(opts.brandColor || "#4F46E5");

  // Arka plan: görsel yoksa marka rengiyle degrade
  const bgDefs = safeImageUrl
    ? `<defs>
        <filter id="blur"><feGaussianBlur stdDeviation="8"/></filter>
      </defs>
      <image href="${safeImageUrl}" x="0" y="0" width="${width}" height="${height}"
             preserveAspectRatio="xMidYMid slice" filter="url(#blur)" opacity="0.6"/>
      <rect width="${width}" height="${height}" fill="rgba(0,0,0,0.55)"/>`
    : `<defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:rgb(${r},${g},${b});stop-opacity:1"/>
          <stop offset="100%" style="stop-color:rgb(${Math.max(r-40,0)},${Math.max(g-40,0)},${Math.max(b-40,0)});stop-opacity:1"/>
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#bg)"/>`;

  // Etiket kutusu (sol üst)
  const labelText = opts.cardLabel || "HABER";
  const labelBg = safeImageUrl ? opts.brandColor : "rgba(255,255,255,0.2)";
  const labelPy = isStory ? 120 : 60;

  // Başlık metin satırları
  const titleLines = wrapText(opts.title, isStory ? 28 : 35);
  const titleFontSize = isStory ? 72 : 56;
  const titleLineHeight = titleFontSize * 1.3;
  const titleY = isStory
    ? height / 2 - (titleLines.length * titleLineHeight) / 2
    : height * 0.42;

  // Alt bar
  const footerY = height - (isStory ? 120 : 80);
  const footerText = `sonbirsoz.com  ·  ${opts.brandName}`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
  width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">

  ${bgDefs}

  <!-- Etiket -->
  <rect x="60" y="${labelPy}" rx="8" ry="8"
        width="${labelText.length * (isStory ? 28 : 22) + 40}" height="${isStory ? 64 : 48}"
        fill="${labelBg}" opacity="0.95"/>
  <text x="80" y="${labelPy + (isStory ? 44 : 32)}"
        font-family="'Arial Black', Arial, sans-serif"
        font-size="${isStory ? 32 : 24}" font-weight="900"
        fill="white" letter-spacing="3">${labelText}</text>

  <!-- Başlık -->
  ${titleLines.map((line, i) =>
    `<text x="${width / 2}" y="${titleY + i * titleLineHeight}"
           text-anchor="middle"
           font-family="'Arial Black', Arial, sans-serif"
           font-size="${titleFontSize}" font-weight="900"
           fill="white"
           style="filter:drop-shadow(2px 2px 4px rgba(0,0,0,0.8))">${escapeXml(line)}</text>`
  ).join("\n  ")}

  <!-- Alt çizgi -->
  <line x1="60" y1="${footerY - 24}" x2="${width - 60}" y2="${footerY - 24}"
        stroke="${opts.brandColor}" stroke-width="4" opacity="0.8"/>

  <!-- Alt metin -->
  <text x="${width / 2}" y="${footerY}"
        text-anchor="middle"
        font-family="Arial, sans-serif"
        font-size="${isStory ? 36 : 28}" font-weight="400"
        fill="rgba(255,255,255,0.85)">${escapeXml(footerText)}</text>

</svg>`;

  const encoded = Buffer.from(svg).toString("base64");
  return {
    svgDataUri: `data:image/svg+xml;base64,${encoded}`,
    width,
    height,
    usedImage,
  };
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Marka bilgilerinden otomatik BrandCardOptions oluşturur.
 */
export function buildBrandCardOptions(
  brand: { name: string; color: string; cardLabel: string | null },
  post: { caption: string; imageUrl: string | null },
  format: "square" | "story" = "square"
): BrandCardOptions {
  // Caption'dan başlığı tahmin et (ilk cümle/satır)
  const title = post.caption.split("\n")[0].replace(/#\S+/g, "").trim().slice(0, 120);
  return {
    title,
    cardLabel: brand.cardLabel || "HABER",
    brandName: brand.name,
    brandColor: brand.color,
    imageUrl: post.imageUrl,
    format,
  };
}
