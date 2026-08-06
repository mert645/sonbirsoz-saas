import { NextRequest, NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";

export const maxDuration = 300;

/**
 * Daily bulletin cron job - Multi-tenant yapıya geçiş nedeniyle devre dışı.
 * TODO: Her tenant için ayrı bülten gönderimi yapılmalı.
 */
export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    success: true,
    message: "Daily bulletin cron is disabled in multi-tenant mode. Will be re-implemented per tenant.",
    sent: 0,
  });
}
