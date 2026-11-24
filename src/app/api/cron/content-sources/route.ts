/**
 * C1 — RSS İçerik Kaynakları Cron
 * GET /api/cron/content-sources
 *
 * Her 15 dakikada çalıştırılır (Amplify/Vercel cron ya da harici cron servis).
 * Tüm aktif ContentSource'ları işler; marka başına günlük tavan uygulanır.
 *
 * Amplify cron örneği (amplify.yml / cron job):
 *   schedule: "rate(15 minutes)"
 *   path: /api/cron/content-sources
 *   method: GET
 *   headers:
 *     x-cron-secret: $CRON_SECRET
 */

import { NextRequest, NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";
import { ingestAllContentSources } from "@/lib/social/content-source-ingest";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // İsteğe bağlı: ?tenantId=xxx ile tek tenant işle
  const tenantId = request.nextUrl.searchParams.get("tenantId") ?? undefined;

  try {
    const results = await ingestAllContentSources(tenantId);

    const totalCreated = results.reduce((s, r) => s + r.created, 0);
    const totalSkipped = results.reduce((s, r) => s + r.skipped, 0);
    const totalErrors = results.flatMap((r) => r.errors);

    return NextResponse.json({
      success: true,
      sources: results.length,
      totalCreated,
      totalSkipped,
      errors: totalErrors,
      details: results.map((r) => ({
        sourceId: r.sourceId,
        brandId: r.brandId,
        created: r.created,
        skipped: r.skipped,
        errors: r.errors,
      })),
    });
  } catch (error) {
    console.error("content-sources cron failed:", error);
    return NextResponse.json(
      { error: "content-sources cron failed", details: String(error) },
      { status: 500 }
    );
  }
}
