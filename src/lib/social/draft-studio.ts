/**
 * C7 — Taslak Stüdyosu (Draft Studio)
 *
 * İki özellik:
 *
 * 1. applyVoiceGuidelines(brandId, caption)
 *    Mevcut caption'ı markanın voiceGuidelines'ına göre yeniden yazar.
 *    "Marka sesine uygula" butonu bu fonksiyonu çağırır.
 *
 * 2. generateWithStyleExamples(brandId, sourceTitle, sourceSpot)
 *    Markanın son 3 "POSTED" gönderisini stil örneği olarak AI'a verir
 *    ve yeni kaynak habere uygulanmış özgün caption üretir.
 *    İlk post üretiminden daha iyi sonuç verir.
 */

import { prisma } from "@/lib/db";
import { invokeBedrockJSON } from "@/lib/ai/bedrock-client";

// ─── Yardımcı: marka bilgilerini getir ───

async function getBrandContext(brandId: string) {
  const brand = await prisma.brand.findUnique({
    where: { id: brandId },
    select: {
      voiceGuidelines: true,
      defaultHashtags: true,
      name: true,
      contentPolicy: true,
    },
  });
  if (!brand) throw new Error(`Marka bulunamadı: ${brandId}`);
  return brand;
}

// ─── Yardımcı: son başarılı gönderileri getir (stil örneği için) ───

async function getStyleExamples(brandId: string, limit = 3): Promise<string[]> {
  const posts = await prisma.brandPost.findMany({
    where: { brandId, status: "POSTED" },
    orderBy: { postedAt: "desc" },
    take: limit,
    select: { caption: true },
  });
  return posts.map((p) => p.caption);
}

// ─── 1. Marka Sesine Uygula ───

export interface ApplyVoiceResult {
  caption: string;
  changed: boolean;
}

/**
 * Mevcut caption'ı markanın voiceGuidelines'ına göre yeniden yazar.
 * voiceGuidelines yoksa orijinal caption döner.
 */
export async function applyVoiceGuidelines(
  brandId: string,
  caption: string
): Promise<ApplyVoiceResult> {
  const brand = await getBrandContext(brandId);

  if (!brand.voiceGuidelines?.trim()) {
    return { caption, changed: false };
  }

  const hashtagStr = brand.defaultHashtags.join(" ");

  const prompt =
    `Marka sesi kuralları:\n${brand.voiceGuidelines}\n\n` +
    `Aşağıdaki sosyal medya paylaşım metnini bu marka sesine uygun şekilde yeniden yaz.\n` +
    `Orijinal metnin bilgi içeriğini koru, yalnızca tonu ve üslubu ayarla.\n` +
    `Etiketleri koru: ${hashtagStr}\n\n` +
    `Orijinal metin:\n${caption}\n\n` +
    `JSON çıktı: {"caption": "yeniden yazılmış metin"}`;

  const result = await invokeBedrockJSON<{ caption: string }>(
    [{ role: "user", content: prompt }],
    {
      system: `Sen ${brand.name} için profesyonel Türk sosyal medya editörüsün. Marka sesine tam uyum sağlarsın.`,
      maxTokens: 512,
      temperature: 0.5,
    }
  );

  const newCaption = result.caption?.trim();
  if (!newCaption || newCaption === caption) return { caption, changed: false };
  return { caption: newCaption, changed: true };
}

// ─── 2. Stil Örnekleriyle Üretim ───

export interface StyleExampleResult {
  caption: string;
  examplesUsed: number;
}

/**
 * Markanın son başarılı gönderilerini üslup örneği olarak vererek
 * yeni kaynak habere özgün caption üretir.
 */
export async function generateWithStyleExamples(
  brandId: string,
  sourceTitle: string,
  sourceSpot: string,
  sourceUrl?: string
): Promise<StyleExampleResult> {
  const brand = await getBrandContext(brandId);
  const examples = await getStyleExamples(brandId, 3);
  const hashtagStr = brand.defaultHashtags.join(" ");

  let styleSection = "";
  if (examples.length > 0) {
    styleSection =
      `\nBu markanın geçmiş başarılı gönderilerinden üslup örnekleri (taklit etme, sadece ton için referans al):\n` +
      examples.map((e, i) => `[Örnek ${i + 1}]\n${e}`).join("\n\n") +
      "\n";
  }

  const voiceSection = brand.voiceGuidelines
    ? `\nMarka sesi kuralları:\n${brand.voiceGuidelines}\n`
    : "";

  const linkNote = sourceUrl
    ? `Metne kaynak linkini ekle: ${sourceUrl}`
    : "Instagram için link bio'da olduğundan metne URL ekleme.";

  const prompt =
    `${voiceSection}${styleSection}\n` +
    `Haber başlığı: ${sourceTitle}\n` +
    `Haber özeti: ${sourceSpot}\n` +
    `${linkNote}\n` +
    `Etiketler (sona ekle): ${hashtagStr}\n\n` +
    `Bu haberi marka sesine ve üslup örneklerine uygun, kısa ve etkili sosyal medya metni olarak yaz.\n` +
    `JSON çıktı: {"caption": "..."}`;

  const result = await invokeBedrockJSON<{ caption: string }>(
    [{ role: "user", content: prompt }],
    {
      system: `Sen ${brand.name} için profesyonel Türk sosyal medya editörüsün.`,
      maxTokens: 512,
      temperature: 0.6,
    }
  );

  return {
    caption: result.caption?.trim() || `${sourceTitle}\n\n${hashtagStr}`,
    examplesUsed: examples.length,
  };
}

// ─── 3. Revize Notu Uygula ───

export interface ApplyRevisionResult {
  caption: string;
}

/**
 * Kullanıcının revize notunu caption'a uygular.
 * Panel'deki "Revize et" butonu için.
 */
export async function applyRevision(
  brandId: string,
  caption: string,
  revisionNote: string
): Promise<ApplyRevisionResult> {
  const brand = await getBrandContext(brandId);

  const prompt =
    `Mevcut sosyal medya metni:\n${caption}\n\n` +
    `Revize talimatı: ${revisionNote}\n\n` +
    `Marka sesi kuralları: ${brand.voiceGuidelines || "Tarafsız, kısa, olgusal."}\n\n` +
    `Revize talimatını uygulayarak metni yeniden yaz. Marka sesini koru.\n` +
    `JSON çıktı: {"caption": "..."}`;

  const result = await invokeBedrockJSON<{ caption: string }>(
    [{ role: "user", content: prompt }],
    {
      system: `Sen ${brand.name} için profesyonel Türk sosyal medya editörüsün.`,
      maxTokens: 512,
      temperature: 0.5,
    }
  );

  return { caption: result.caption?.trim() || caption };
}
