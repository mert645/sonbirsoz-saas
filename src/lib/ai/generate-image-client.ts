"use client";

// İstemci tarafı yardımcı: görsel üretim job'ını submit edip status uçtan
// tamamlanana kadar poll eder. API route senkron değil (CloudFront 30sn kenar
// limiti nedeniyle) — bunun yerine jobId döner ve burada poll ederiz.

export interface GenerateImageParams {
  title?: string;
  prompt?: string;
  category?: string;
  purpose?: "cover" | "social_square" | "social_story" | "thumbnail";
}

export interface GenerateImageResult {
  imageUrl: string;
  provider?: string;
}

const POLL_INTERVAL_MS = 3000;
const POLL_MAX_ATTEMPTS = 50; // ~2.5 dk

export async function generateImageViaApi(
  params: GenerateImageParams,
): Promise<GenerateImageResult> {
  const res = await fetch("/api/ai/generate-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || "Görsel üretilemedi.");
  }

  // Senkron fallback (SSM devrede değilken): imageUrl doğrudan döner.
  if (json.mode === "sync" && json.imageUrl) {
    return { imageUrl: json.imageUrl, provider: json.provider };
  }

  // Asenkron: jobId'yi status uçtan poll et.
  if (json.mode === "async" && json.jobId) {
    for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      const statusRes = await fetch(
        `/api/ai/generate-image/status?jobId=${encodeURIComponent(json.jobId)}`,
      );
      const status = await statusRes.json().catch(() => ({}));
      if (status.status === "COMPLETED" && status.imageUrl) {
        return { imageUrl: status.imageUrl, provider: json.provider };
      }
      if (status.status === "FAILED") {
        // SSM başarısız → senkron Bedrock/OpenAI fallback'e düş.
        return await generateImageSyncFallback(params);
      }
    }
    // Zaman aşımı → yine de senkron fallback dene.
    return await generateImageSyncFallback(params);
  }

  throw new Error(json.error || "Görsel üretilemedi.");
}

/** SSM job başarısız/zaman aşımı durumunda senkron Bedrock/OpenAI yolunu zorla. */
async function generateImageSyncFallback(
  params: GenerateImageParams,
): Promise<GenerateImageResult> {
  const res = await fetch("/api/ai/generate-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...params, forceSyncFallback: true }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Görsel üretilemedi (fallback).");
  if (json.imageUrl) return { imageUrl: json.imageUrl, provider: json.provider };
  throw new Error("Görsel üretilemedi. Lütfen tekrar deneyin.");
}
