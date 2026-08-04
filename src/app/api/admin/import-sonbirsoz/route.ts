import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireEditor } from "@/lib/data/article-mutations";
import { importSonbirsozArticles } from "@/lib/feeds/sonbirsoz-import-service";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * sonbirsoz.com'daki güncel haberleri çekip DB'ye PUBLISHED Article olarak
 * aktarır. Admin oturumu veya CRON_SECRET ile yetkilendirilir.
 *
 * Body (opsiyonel): { limit?: number }  — kaç haber işlensin (varsayılan 60).
 */
export async function POST(request: NextRequest) {
  const cronSecret = request.headers.get("x-cron-secret");
  const isCron = !!cronSecret && cronSecret === process.env.CRON_SECRET;

  let userId: string | undefined;
  if (!isCron) {
    const user = await requireEditor();
    if (!user) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    userId = user.id;
  }

  try {
    const body = await request.json().catch(() => ({}));
    const limit =
      typeof body?.limit === "number"
        ? Math.min(Math.max(body.limit, 1), 100)
        : 60;

    const result = await importSonbirsozArticles(prisma, { limit, userId });

    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("import-sonbirsoz failed:", msg);
    return NextResponse.json(
      { error: "İçe aktarma başarısız", details: msg },
      { status: 500 },
    );
  }
}
