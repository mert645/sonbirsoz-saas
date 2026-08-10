import { NextRequest, NextResponse } from "next/server";
import {
  submitImageJob,
  generateImage,
  buildNewsImagePrompt,
  type ImagePurpose,
  hasAnyImageProvider,
} from "@/lib/ai/media-generator";
import { requireEditor } from "@/lib/data/article-mutations";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  // İki yetkilendirme yolu: (1) admin oturumu, (2) cron/otomasyon secret'ı.
  const cronSecret = request.headers.get("x-cron-secret");
  const isCron = !!cronSecret && cronSecret === process.env.CRON_SECRET;

  if (!isCron) {
    const user = await requireEditor();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // API anahtarı kontrolü
  if (!hasAnyImageProvider()) {
    return NextResponse.json(
      {
        error: "Görsel üretimi yapılandırılmamış",
        details:
          "AI görsel üretimi için SSM_CONTENT_API_KEY, OPENAI_API_KEY veya AWS Bedrock kimlik bilgilerinden en az biri .env dosyasında tanımlanmalıdır.",
        missingConfig: true,
      },
      { status: 503 },
    );
  }

  try {
    const body = await request.json();
    const { prompt, title, category, purpose, forceSyncFallback } = body as {
      prompt?: string;
      title?: string;
      category?: string;
      purpose?: ImagePurpose;
      forceSyncFallback?: boolean;
    };

    const imagePurpose: ImagePurpose = purpose || "cover";
    const imagePrompt =
      (prompt && prompt.trim()) ||
      buildNewsImagePrompt(title || "", category || "gundem");

    if (!imagePrompt) {
      return NextResponse.json(
        { error: "prompt veya title zorunlu" },
        { status: 400 },
      );
    }

    // forceSyncFallback=true ise SSM'i atla, direkt senkron fallback kullan.
    if (!forceSyncFallback) {
      const submitted = await submitImageJob(imagePrompt, imagePurpose);
      if (submitted) {
        return NextResponse.json({
          success: true,
          mode: "async",
          jobId: submitted.jobId,
          provider: submitted.provider,
        });
      }
    }

    // SSM yoksa/kabul etmezse ya da forceSyncFallback: senkron fallback.
    const result = await generateImage(imagePrompt, imagePurpose);
    return NextResponse.json({ success: true, mode: "sync", ...result });
  } catch (error) {
    console.error("Image generation failed:", error);
    return NextResponse.json(
      { error: "Görsel üretilemedi", details: String(error) },
      { status: 500 },
    );
  }
}
