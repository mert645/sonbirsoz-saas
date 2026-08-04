import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { SITE_NAME, SITE_URL } from "@/lib/utils/constants";

export const dynamic = "force-dynamic";

/**
 * Token'lı abonelik iptali: /api/newsletter/unsubscribe?token=...
 * E-posta içindeki linkten tek tıkla çalışır, giriş gerektirmez.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  let ok = false;
  if (token) {
    try {
      const result = await prisma.newsletterSubscriber.updateMany({
        where: { unsubscribeToken: token },
        data: { isActive: false },
      });
      ok = result.count > 0;
    } catch {
      ok = false;
    }
  }

  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex">
  <title>${ok ? "Abonelik iptal edildi" : "Geçersiz bağlantı"} — ${SITE_NAME}</title>
</head>
<body style="margin:0;background:#f4f4f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:480px;margin:80px auto;background:#fff;border-radius:12px;padding:40px 32px;text-align:center;">
    <div style="font-size:40px;margin-bottom:12px;">${ok ? "✅" : "⚠️"}</div>
    <h1 style="margin:0 0 10px;font-size:20px;color:#18181b;">
      ${ok ? "Aboneliğiniz iptal edildi" : "Bağlantı geçersiz veya süresi dolmuş"}
    </h1>
    <p style="margin:0 0 24px;color:#52525b;font-size:14px;line-height:1.6;">
      ${
        ok
          ? "Artık bülten e-postası almayacaksınız. Fikrinizi değiştirirseniz sitemizden tekrar abone olabilirsiniz."
          : "Abonelik iptal bağlantısı doğrulanamadı. Sorun devam ederse bize ulaşın."
      }
    </p>
    <a href="${SITE_URL}" style="display:inline-block;background:#c00000;color:#fff;padding:10px 22px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">${SITE_NAME}'e dön</a>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    status: ok ? 200 : 400,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
