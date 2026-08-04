import { NextRequest, NextResponse } from "next/server";
import { generateArticleFromSources, type NewsSource } from "@/lib/ai/news-generator";
import { isCronAuthorized } from "@/lib/cron-auth";
import { requireEditor } from "@/lib/data/article-mutations";

export async function POST(request: NextRequest) {
  try {
    // Yetkilendirme: geçerli cron secret'ı VEYA admin oturumu şart.
    if (!isCronAuthorized(request)) {
      const user = await requireEditor();
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = await request.json();
    const { sources } = body as { sources: NewsSource[] };

    if (!sources || !Array.isArray(sources) || sources.length === 0) {
      return NextResponse.json(
        { error: "At least one news source is required" },
        { status: 400 }
      );
    }

    const article = await generateArticleFromSources(sources);

    return NextResponse.json({
      success: true,
      article,
    });
  } catch (error) {
    console.error("Article generation failed:", error);
    return NextResponse.json(
      { error: "Article generation failed", details: String(error) },
      { status: 500 }
    );
  }
}
