/**
 * C1 — İçerik Kaynağı İngest Motoru
 *
 * Her 15 dakikada sonbirsoz.com RSS beslemelerini çeker, filtreler,
 * hukuki ve hassas içerik kapısından geçirir, marka sesiyle sosyal medya
 * metni üretir ve BrandPost kaydı açar.
 *
 * Mimari:
 *   ContentSource (RSS url + filtre) → RSS items → filtre → kapasite kontrolü
 *   → tekrar önleme → legalGuard → AI caption → BrandPost (DRAFT | PENDING_APPROVAL)
 */

import { prisma } from "@/lib/db";
import { parseFeed } from "@/lib/feeds/rss-parser";
import { legalGuard } from "@/lib/social/legal-guard";
import { moderateContent } from "@/lib/ai/moderation";
import { invokeBedrockJSON } from "@/lib/ai/bedrock-client";

// ─── Tipler ───

export interface IngestResult {
  sourceId: string;
  brandId: string;
  processed: number;
  created: number;
  skipped: number;
  errors: string[];
}

// ─── Yardımcı: slot uygunluğu ───

/**
 * Bugün bu marka için kaç BrandPost oluşturuldu?
 * Günlük tavana ulaşıldıysa yeni gönderi oluşturulmaz.
 */
async function todayPostCount(brandId: string): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  return prisma.brandPost.count({
    where: {
      brandId,
      createdAt: { gte: startOfDay },
      status: { notIn: ["REJECTED"] },
    },
  });
}

/**
 * Bugün için marka tarafından işlenmemiş ilk uygun zaman slotunu döner.
 * preferredTimes: ["10:00", "17:00", "21:30"] (TR saati, UTC+3)
 */
function nextAvailableSlot(preferredTimes: string[]): Date {
  const now = new Date();
  const TZ_OFFSET_MS = 3 * 60 * 60 * 1000; // UTC+3

  for (const t of preferredTimes) {
    const [h, m] = t.split(":").map(Number);
    const slot = new Date(now);
    slot.setUTCHours(h - 3, m, 0, 0); // TR saatini UTC'ye çevir
    if (slot.getTime() > now.getTime() + TZ_OFFSET_MS) {
      return slot;
    }
  }

  // Tüm slotlar geçmişte → yarın ilk slot
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const [h, m] = preferredTimes[0].split(":").map(Number);
  tomorrow.setUTCHours(h - 3, m, 0, 0);
  return tomorrow;
}

// ─── Yardımcı: anahtar kelime filtresi ───

function matchesKeywords(
  text: string,
  keywords: string[],
  excludeKeywords: string[]
): boolean {
  const lower = text.toLowerCase();

  // Dışlama önce — dışlanacak kelime varsa al
  for (const kw of excludeKeywords) {
    if (lower.includes(kw.toLowerCase())) return false;
  }

  // Anahtar kelime yoksa tüm öğeleri al
  if (!keywords.length) return true;

  // En az bir anahtar kelime eşleşmeli
  return keywords.some((kw) => lower.includes(kw.toLowerCase()));
}

// ─── Yardımcı: Ajans görseli mi? ───

const AGENCY_DOMAINS = [
  "aa.com.tr", "dha.com.tr", "iha.com.tr",
  "hurriyet.com.tr", "milliyet.com.tr", "sabah.com.tr",
];

function isAgencyImage(url: string): boolean {
  if (!url) return false;
  return AGENCY_DOMAINS.some((d) => url.includes(d));
}

// ─── Yardımcı: AI ile marka sesi metin üretimi ───

interface BrandCaptionInput {
  title: string;
  spot: string;
  sourceUrl: string;
  voiceGuidelines: string;
  defaultHashtags: string[];
  platform: "instagram" | "facebook" | "general";
}

async function generateBrandCaption(input: BrandCaptionInput): Promise<string> {
  const hashtagStr = input.defaultHashtags.join(" ");
  const platformNote =
    input.platform === "instagram"
      ? "Instagram için: link bio'da olduğundan metne URL ekleme."
      : `Metne kaynak linki ekle: ${input.sourceUrl}`;

  const prompt = `Marka sesi kuralları:\n${input.voiceGuidelines}\n\n`
    + `Haber başlığı: ${input.title}\n`
    + `Haber özeti: ${input.spot}\n`
    + `${platformNote}\n`
    + `Etiketler (sona ekle): ${hashtagStr}\n\n`
    + `Bu haberi marka sesine uygun, kısa ve etkili bir sosyal medya paylaşım metni olarak yaz. `
    + `Yalnızca paylaşım metnini döndür (JSON: {"caption": "..."}).`;

  const result = await invokeBedrockJSON<{ caption: string }>(
    [{ role: "user", content: prompt }],
    {
      system: "Sen profesyonel bir Türk sosyal medya editörüsün. Verilen marka sesine tam uygun, kısa ve etkili paylaşım metinleri yazarsın.",
      maxTokens: 512,
      temperature: 0.6,
    }
  );

  return result.caption || `${input.title}\n\n${hashtagStr}`;
}

// ─── ANA İNGEST FONKSİYONU ───

export async function ingestContentSource(
  sourceId: string
): Promise<IngestResult> {
  const result: IngestResult = {
    sourceId,
    brandId: "",
    processed: 0,
    created: 0,
    skipped: 0,
    errors: [],
  };

  // 1. Kaynak ve marka bilgilerini getir
  const source = await prisma.contentSource.findUnique({
    where: { id: sourceId },
    include: {
      brand: {
        select: {
          id: true,
          dailyPostLimit: true,
          preferredTimes: true,
          voiceGuidelines: true,
          defaultHashtags: true,
          contentPolicy: true,
          requiresApproval: true,
          isActive: true,
        },
      },
    },
  });

  if (!source || !source.isActive || !source.brand.isActive) {
    result.skipped++;
    return result;
  }

  result.brandId = source.brandId;

  // 2. Günlük tavan kontrolü
  const todayCount = await todayPostCount(source.brandId);
  if (todayCount >= source.brand.dailyPostLimit) {
    result.skipped++;
    await prisma.contentSource.update({
      where: { id: sourceId },
      data: { lastFetchedAt: new Date() },
    });
    return result;
  }

  // 3. RSS çek
  let items;
  try {
    const feed = await parseFeed(source.url);
    items = feed.items;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    result.errors.push(`RSS çekim hatası: ${msg}`);
    await prisma.contentSource.update({
      where: { id: sourceId },
      data: { lastError: msg, lastFetchedAt: new Date() },
    });
    return result;
  }

  // 4. Tazelik filtresi
  const freshnessMs = source.freshnessDays * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const freshItems = items.filter((item) => {
    if (!item.pubDate) return true; // tarih yoksa al
    const age = now - new Date(item.pubDate).getTime();
    return age <= freshnessMs;
  });

  // 5. Her öğeyi işle
  for (const item of freshItems) {
    if (result.created + todayCount >= source.brand.dailyPostLimit) break;

    result.processed++;
    const guid = item.guid || item.link;

    // 5a. Tekrar önleme
    const exists = await prisma.contentSourceItem.findUnique({
      where: { sourceId_guid: { sourceId, guid } },
    });
    if (exists) { result.skipped++; continue; }

    // 5b. Anahtar kelime filtresi
    const textToFilter = `${item.title} ${item.description}`;
    if (!matchesKeywords(textToFilter, source.keywords, source.excludeKeywords)) {
      result.skipped++;
      continue;
    }

    // 5c. Hukuki kapı
    const legal = legalGuard({
      title: item.title,
      text: item.description,
      imageUrl: item.imageUrl,
      contentPolicy: source.brand.contentPolicy as "STANDARD" | "NEWS" | "CRIME",
    });

    if (legal.action === "BLOCK") {
      // Tekrar önleme kaydını yine de aç (aynı öğe bir daha denemesin)
      await prisma.contentSourceItem.create({
        data: { sourceId, guid, postId: null },
      });
      result.skipped++;
      continue;
    }

    // 5d. AI moderasyon (hızlı kontrol)
    let modDecision: "APPROVED" | "REJECTED" | "REVIEW" = "APPROVED";
    try {
      const mod = await moderateContent({ title: item.title, text: item.description });
      modDecision = mod.decision;
    } catch {
      modDecision = "REVIEW"; // AI erişilemezse kuyruğa düşür
    }

    if (modDecision === "REJECTED") {
      await prisma.contentSourceItem.create({
        data: { sourceId, guid, postId: null },
      });
      result.skipped++;
      continue;
    }

    // 5e. Durum belirleme
    // requiresApproval=true VEYA hukuki uyarı/AI review → PENDING_APPROVAL
    const needsApproval =
      source.brand.requiresApproval ||
      legal.action === "REVIEW" ||
      modDecision === "REVIEW";

    const postStatus = needsApproval ? "PENDING_APPROVAL" : "DRAFT";

    // 5f. Ajans görseli kontrol → telifli ise imageUrl kullanma
    const safeImageUrl =
      item.imageUrl && !isAgencyImage(item.imageUrl) ? item.imageUrl : undefined;

    // 5g. AI ile marka sesi metni üret
    let caption = `${item.title}\n\n${source.brand.defaultHashtags.join(" ")}`;
    try {
      caption = await generateBrandCaption({
        title: item.title,
        spot: item.description.slice(0, 300),
        sourceUrl: item.link,
        voiceGuidelines: source.brand.voiceGuidelines || "Tarafsız, kısa, olgusal haber dili.",
        defaultHashtags: source.brand.defaultHashtags,
        platform: "general",
      });
    } catch {
      // AI başarısız → ham başlık + etiketler
    }

    // 5h. Zaman slotu
    const scheduledAt = nextAvailableSlot(source.brand.preferredTimes);

    // 5i. BrandPost oluştur
    const rejectionNote = legal.note || undefined;
    const post = await prisma.brandPost.create({
      data: {
        brandId: source.brandId,
        status: postStatus,
        caption,
        imageUrl: safeImageUrl || null,
        sourceUrl: item.link,
        internalLabel: `kaynak: ${item.link}`,
        rejectionNote: rejectionNote || null,
        scheduledAt,
      },
    });

    // 5j. Tekrar önleme kaydı
    await prisma.contentSourceItem.create({
      data: { sourceId, guid, postId: post.id },
    });

    result.created++;
  }

  // 6. Kaynak güncelle
  await prisma.contentSource.update({
    where: { id: sourceId },
    data: { lastFetchedAt: new Date(), lastError: null },
  });

  return result;
}

/**
 * Tüm aktif ContentSource'ları işler (cron tarafından çağrılır).
 */
export async function ingestAllContentSources(
  tenantId?: string
): Promise<IngestResult[]> {
  const sources = await prisma.contentSource.findMany({
    where: {
      isActive: true,
      ...(tenantId ? { tenantId } : {}),
      brand: { isActive: true },
    },
    select: { id: true },
  });

  const results: IngestResult[] = [];
  for (const source of sources) {
    try {
      const r = await ingestContentSource(source.id);
      results.push(r);
    } catch (err) {
      results.push({
        sourceId: source.id,
        brandId: "",
        processed: 0,
        created: 0,
        skipped: 0,
        errors: [err instanceof Error ? err.message : String(err)],
      });
    }
  }

  return results;
}
