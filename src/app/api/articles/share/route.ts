import { NextRequest, NextResponse } from "next/server";
import { incrementShareCount } from "@/lib/data/articles";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { articleId?: string };
    if (!body.articleId || typeof body.articleId !== "string") {
      return NextResponse.json({ error: "articleId gerekli" }, { status: 400 });
    }
    await incrementShareCount(body.articleId);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }
}
