import type { NextRequest } from "next/server";

/**
 * Cron endpoint yetkilendirmesi — secret YALNIZCA header ile kabul edilir.
 * (Query string ile secret, access log/CDN loglarına sızabildiği için kaldırıldı.)
 * Desteklenen header'lar: `x-cron-secret: <secret>` veya `Authorization: Bearer <secret>`.
 */
export function isCronAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const headerSecret = request.headers.get("x-cron-secret");
  if (headerSecret === secret) return true;

  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) return true;

  return false;
}
