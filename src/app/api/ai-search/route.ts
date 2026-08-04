import { NextRequest, NextResponse } from "next/server";
import { aiSearch, isAiSearchAvailable } from "@/lib/ai/ai-search";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** RAG tabanlı AI arama — arşiv üzerinde alıntılı AI cevabı döner. */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (q.length < 3) {
    return NextResponse.json(
      { error: "Sorgu en az 3 karakter olmalı." },
      { status: 400 }
    );
  }
  if (q.length > 300) {
    return NextResponse.json({ error: "Sorgu çok uzun." }, { status: 400 });
  }
  if (!isAiSearchAvailable()) {
    return NextResponse.json(
      { error: "AI arama şu anda kullanılamıyor." },
      { status: 503 }
    );
  }

  const result = await aiSearch(q);
  if (!result) {
    return NextResponse.json(
      { data: null, message: "Arşivde bu soruyla ilgili yeterli içerik bulunamadı." },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(
    { data: result },
    { headers: { "Cache-Control": "no-store" } }
  );
}
