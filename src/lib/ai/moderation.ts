import { invokeBedrockJSON } from "./bedrock-client";
import { prisma } from "@/lib/db";

/**
 * Hibrit AI ön-moderasyon (2026 sektör standardı):
 * - AI skorlar → temiz içerik otomatik onay (~%85)
 * - Açık ihlal → otomatik red
 * - Gri bölge → insan kuyruğu (REVIEW)
 *
 * Her karar ModerationLog'a yazılır (denetlenebilirlik / AI Act uyumu).
 */

export const MODERATION_CATEGORIES = [
  "illegal",        // yasa dışı içerik/faaliyet teşviki
  "profanity",      // küfür / ağır hakaret
  "hate",           // nefret söylemi / ayrımcılık
  "violence",       // şiddet yüceltme / vahşet detayı
  "sexual",         // müstehcenlik
  "disinformation", // açık dezenformasyon işaretleri
] as const;

export type ModerationCategory = (typeof MODERATION_CATEGORIES)[number];
export type ModerationScores = Record<ModerationCategory, number>;
export type ModerationDecision = "APPROVED" | "REJECTED" | "REVIEW";

export interface ModerationResult {
  decision: ModerationDecision;
  scores: ModerationScores;
  maxCategory: ModerationCategory | null;
  maxScore: number;
  reason: string;
  model: string;
}

// Eşikler: üstü kesin red, altı temiz; arası insan kuyruğu.
const REJECT_THRESHOLD = 0.85;
const REVIEW_THRESHOLD = 0.5;

const MODERATION_MODEL =
  process.env.BEDROCK_MODERATION_MODEL_ID ||
  process.env.BEDROCK_MODEL_ID ||
  "eu.anthropic.claude-haiku-4-5-v1";

const SYSTEM_PROMPT = `Sen bir Türk haber platformu için içerik moderasyon uzmanısın. Görevin verilen içeriği aşağıdaki kategorilerde 0.0-1.0 arası skorlamak:

- illegal: yasa dışı faaliyet teşviki, suç talimatı
- profanity: küfür, ağır hakaret
- hate: nefret söylemi, etnik/dini/cinsiyet ayrımcılığı
- violence: şiddet yüceltme, gereksiz vahşet detayı
- sexual: müstehcen içerik
- disinformation: açık dezenformasyon işaretleri (kaynaksız komplo, sahte iddia sunumu)

ÖNEMLİ BAĞLAM: Bu bir HABER platformudur. Şiddet, suç ve savaş HABERLERİ gazetecilik kapsamındadır ve DÜŞÜK skor almalıdır. Yüksek skor yalnızca içerik ihlali TEŞVİK, YÜCELTME veya normalleştirme yaptığında verilir. Tarafsız haber dili = temiz.

ÇIKTI (yalnızca JSON):
{"scores": {"illegal": 0.0, "profanity": 0.0, "hate": 0.0, "violence": 0.0, "sexual": 0.0, "disinformation": 0.0}, "reason": "tek cümlelik gerekçe"}`;

/** Skorlardan karar üretir (eşik mantığı — test edilebilir saf fonksiyon). */
export function decideFromScores(scores: ModerationScores): {
  decision: ModerationDecision;
  maxCategory: ModerationCategory | null;
  maxScore: number;
} {
  let maxCategory: ModerationCategory | null = null;
  let maxScore = 0;
  for (const cat of MODERATION_CATEGORIES) {
    const s = scores[cat] ?? 0;
    if (s > maxScore) {
      maxScore = s;
      maxCategory = cat;
    }
  }
  if (maxScore >= REJECT_THRESHOLD) return { decision: "REJECTED", maxCategory, maxScore };
  if (maxScore >= REVIEW_THRESHOLD) return { decision: "REVIEW", maxCategory, maxScore };
  return { decision: "APPROVED", maxCategory, maxScore };
}

/** İçeriği Bedrock ile skorlar. AI erişilemezse güvenli taraf: REVIEW. */
export async function moderateContent(input: {
  title?: string;
  text: string;
}): Promise<ModerationResult> {
  const content = [
    input.title ? `BAŞLIK: ${input.title}` : null,
    `İÇERİK:\n${input.text.replace(/<[^>]+>/g, " ").slice(0, 6000)}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const result = await invokeBedrockJSON<{ scores: ModerationScores; reason: string }>(
      [{ role: "user", content }],
      { system: SYSTEM_PROMPT, model: MODERATION_MODEL, maxTokens: 512, temperature: 0 }
    );

    const scores = result.scores;
    const { decision, maxCategory, maxScore } = decideFromScores(scores);
    return {
      decision,
      scores,
      maxCategory,
      maxScore,
      reason: result.reason || "",
      model: MODERATION_MODEL,
    };
  } catch (err) {
    // AI kullanılamıyorsa otomatik yayınlama YAPMA — insan kuyruğuna düşür.
    const empty = Object.fromEntries(
      MODERATION_CATEGORIES.map((c) => [c, 0])
    ) as ModerationScores;
    return {
      decision: "REVIEW",
      scores: empty,
      maxCategory: null,
      maxScore: 0,
      reason: `AI moderasyon kullanılamadı: ${err instanceof Error ? err.message : String(err)}`,
      model: MODERATION_MODEL,
    };
  }
}

/**
 * Modere et + ModerationLog kaydı oluştur.
 * articleId/commentId sonradan da bağlanabilir (attachModerationLog).
 */
export async function moderateAndLog(input: {
  title?: string;
  text: string;
  contentType: "article" | "comment";
  source: string; // "ai-generate" | "import" | "rss" | "comment" | "manual"
  tenantId?: string;
  articleId?: string;
  commentId?: string;
}): Promise<ModerationResult & { logId: string | null }> {
  const result = await moderateContent({ title: input.title, text: input.text });

  let logId: string | null = null;
  
  // tenantId yoksa log oluşturma (multi-tenant zorunluluğu)
  if (!input.tenantId) {
    console.warn("ModerationLog: tenantId eksik, log oluşturulmadı");
    return { ...result, logId };
  }
  
  try {
    const log = await prisma.moderationLog.create({
      data: {
        tenantId: input.tenantId,
        articleId: input.articleId || null,
        commentId: input.commentId || null,
        contentType: input.contentType,
        source: input.source,
        decision: result.decision,
        scores: result.scores,
        maxCategory: result.maxCategory,
        maxScore: result.maxScore,
        reason: result.reason,
        model: result.model,
      },
    });
    logId = log.id;
  } catch (err) {
    console.error("ModerationLog kaydı başarısız:", err);
  }

  return { ...result, logId };
}

/** Log'u sonradan oluşturulan içeriğe bağla (önce modere edip sonra kayıt açan akışlar için). */
export async function attachModerationLog(
  logId: string,
  target: { articleId?: string; commentId?: string }
) {
  try {
    await prisma.moderationLog.update({
      where: { id: logId },
      data: {
        articleId: target.articleId || undefined,
        commentId: target.commentId || undefined,
      },
    });
  } catch (err) {
    console.error("ModerationLog bağlama başarısız:", err);
  }
}

/**
 * Bedrock'suz hızlı yerel kontrol — güvenilir kaynaklardan (kendi canlı
 * sitemiz) içe aktarılan içerik için ucuz ön filtre. Şüpheli kalıp bulunursa
 * true döner (bu durumda tam AI moderasyonu çağrılmalı).
 */
// NOT: JS \b sınırı Türkçe karakterlerle (ı, ş, ğ...) çalışmaz; düz kalıp kullan.
const QUICK_FLAG_PATTERNS: RegExp[] = [
  /(porno|çıplak fotoğraf)/i,
  /(nasıl bomba yapılır|bomba yapımı)/i,
  /(kahpe|orospu|piç kurusu|amına)/i,
];

export function quickFlag(text: string): boolean {
  const plain = text.replace(/<[^>]+>/g, " ");
  return QUICK_FLAG_PATTERNS.some((re) => re.test(plain));
}
