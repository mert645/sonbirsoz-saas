import { NextRequest, NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";

// AI üretimi (Bedrock çağrıları) uzun sürebilir; SSR Lambda default 30sn'yi aşar.
export const maxDuration = 300;

/**
 * Generate articles cron job - Multi-tenant yapıya geçiş nedeniyle devre dışı.
 * TODO: Her tenant için ayrı AI makale üretimi yapılmalı.
 */
export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    success: true,
    message: "Generate articles cron is disabled in multi-tenant mode. Will be re-implemented per tenant.",
    generated: 0,
  });
}
