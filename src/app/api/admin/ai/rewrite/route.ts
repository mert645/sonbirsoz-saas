import { NextRequest, NextResponse } from "next/server";
import { requireEditor } from "@/lib/data/article-mutations";
import { rewriteText } from "@/lib/ai/news-generator";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const user = await requireEditor();
  if (!user) return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const text: string = body?.text?.trim();
  const instruction: string = body?.instruction?.trim() || "Daha güçlü ve etkili bir şekilde yeniden yaz";

  if (!text || text.length < 3) {
    return NextResponse.json({ error: "Metin çok kısa." }, { status: 400 });
  }

  try {
    const result = await rewriteText(text, instruction);
    return NextResponse.json({ text: result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("AI rewrite error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
