import { NextRequest, NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * Collect news cron job - Multi-tenant yapıya geçiş nedeniyle devre dışı.
 * TODO: Her tenant için ayrı RSS kaynakları ve import işlemi yapılmalı.
 */
export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    success: true,
    message: "Collect news cron is disabled in multi-tenant mode. Will be re-implemented per tenant.",
    sourcesChecked: 0,
    newItems: 0,
  });
}
