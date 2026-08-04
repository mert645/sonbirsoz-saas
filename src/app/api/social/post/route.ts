import { NextRequest, NextResponse } from "next/server";
import { postToAllPlatforms, type Platform, type ArticleForSocial } from "@/lib/social/social-orchestrator";
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
    const { article, platforms } = body as {
      article: ArticleForSocial;
      platforms: Platform[];
    };

    if (!article || !platforms || platforms.length === 0) {
      return NextResponse.json(
        { error: "article and platforms are required" },
        { status: 400 }
      );
    }

    const results = await postToAllPlatforms(article, platforms);

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: failCount === 0,
      summary: { total: results.length, success: successCount, failed: failCount },
      results,
    });
  } catch (error) {
    console.error("Social posting failed:", error);
    return NextResponse.json(
      { error: "Social posting failed", details: String(error) },
      { status: 500 }
    );
  }
}
