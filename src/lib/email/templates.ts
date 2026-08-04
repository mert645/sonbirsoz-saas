import { SITE_NAME, SITE_URL } from "@/lib/utils/constants";

/**
 * E-posta HTML şablonları — inline stil (e-posta istemcileri harici CSS desteklemez).
 * Marka rengi: #c00000 (Son Bir Söz kırmızısı).
 */

const BRAND = "#c00000";

function layout(content: string, unsubscribeUrl?: string): string {
  return `<!DOCTYPE html>
<html lang="tr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;">
        <tr>
          <td style="background:${BRAND};padding:18px 28px;">
            <a href="${SITE_URL}" style="color:#ffffff;font-size:20px;font-weight:800;text-decoration:none;letter-spacing:-0.3px;">${SITE_NAME}</a>
          </td>
        </tr>
        <tr><td style="padding:28px;">${content}</td></tr>
        <tr>
          <td style="padding:20px 28px;border-top:1px solid #e4e4e7;">
            <p style="margin:0;color:#71717a;font-size:12px;line-height:1.6;">
              Bu e-postayı ${SITE_NAME} bültenine abone olduğunuz için alıyorsunuz.
              ${unsubscribeUrl ? `<br><a href="${unsubscribeUrl}" style="color:#71717a;text-decoration:underline;">Abonelikten çık</a>` : ""}
              <br>© ${new Date().getFullYear()} ${SITE_NAME} — <a href="${SITE_URL}" style="color:#71717a;">${SITE_URL.replace("https://", "")}</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function welcomeEmail(name: string | null, unsubscribeUrl: string): {
  subject: string;
  html: string;
  text: string;
} {
  const greeting = name ? `Merhaba ${name},` : "Merhaba,";
  return {
    subject: `${SITE_NAME} bültenine hoş geldiniz`,
    html: layout(
      `<h1 style="margin:0 0 14px;font-size:22px;color:#18181b;">Aramıza hoş geldiniz 👋</h1>
       <p style="margin:0 0 12px;color:#3f3f46;font-size:15px;line-height:1.7;">${greeting}</p>
       <p style="margin:0 0 12px;color:#3f3f46;font-size:15px;line-height:1.7;">
         ${SITE_NAME} bültenine aboneliğiniz başarıyla oluşturuldu. Günün öne çıkan haberlerini
         ve önemli son dakika gelişmelerini e-posta kutunuza göndereceğiz.
       </p>
       <p style="margin:20px 0 0;">
         <a href="${SITE_URL}" style="display:inline-block;background:${BRAND};color:#ffffff;padding:11px 22px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">Güncel haberlere göz atın</a>
       </p>`,
      unsubscribeUrl
    ),
    text: `${greeting}\n\n${SITE_NAME} bültenine aboneliğiniz oluşturuldu. Güncel haberler: ${SITE_URL}\n\nAbonelikten çıkmak için: ${unsubscribeUrl}`,
  };
}

export interface BulletinArticle {
  title: string;
  spot: string | null;
  url: string;
  category: string;
  image?: string | null;
}

export function dailyBulletinEmail(
  articles: BulletinArticle[],
  unsubscribeUrl: string
): { subject: string; html: string; text: string } {
  const date = new Date().toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const rows = articles
    .map(
      (a) => `
      <tr><td style="padding:14px 0;border-bottom:1px solid #f1f1f3;">
        <p style="margin:0 0 4px;"><span style="color:${BRAND};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">${a.category}</span></p>
        <a href="${a.url}" style="color:#18181b;font-size:16px;font-weight:700;text-decoration:none;line-height:1.4;">${a.title}</a>
        ${a.spot ? `<p style="margin:6px 0 0;color:#52525b;font-size:13px;line-height:1.6;">${a.spot}</p>` : ""}
      </td></tr>`
    )
    .join("");

  return {
    subject: `Günün Özeti — ${date}`,
    html: layout(
      `<h1 style="margin:0 0 4px;font-size:22px;color:#18181b;">Günün Özeti</h1>
       <p style="margin:0 0 16px;color:#71717a;font-size:13px;">${date}</p>
       <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
       <p style="margin:20px 0 0;">
         <a href="${SITE_URL}" style="display:inline-block;background:${BRAND};color:#ffffff;padding:11px 22px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">Tüm haberler</a>
       </p>`,
      unsubscribeUrl
    ),
    text: `Günün Özeti — ${date}\n\n${articles.map((a) => `• ${a.title}\n  ${a.url}`).join("\n\n")}\n\nAbonelikten çıkmak için: ${unsubscribeUrl}`,
  };
}

export function breakingEmail(
  title: string,
  spot: string | null,
  url: string,
  unsubscribeUrl: string
): { subject: string; html: string; text: string } {
  return {
    subject: `SON DAKİKA: ${title}`,
    html: layout(
      `<p style="margin:0 0 10px;"><span style="display:inline-block;background:${BRAND};color:#ffffff;font-size:11px;font-weight:800;letter-spacing:0.5px;padding:4px 10px;border-radius:4px;">SON DAKİKA</span></p>
       <h1 style="margin:0 0 12px;font-size:22px;color:#18181b;line-height:1.35;">${title}</h1>
       ${spot ? `<p style="margin:0 0 16px;color:#3f3f46;font-size:15px;line-height:1.7;">${spot}</p>` : ""}
       <p style="margin:16px 0 0;">
         <a href="${url}" style="display:inline-block;background:${BRAND};color:#ffffff;padding:11px 22px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">Haberin devamını okuyun</a>
       </p>`,
      unsubscribeUrl
    ),
    text: `SON DAKİKA: ${title}\n\n${spot || ""}\n\n${url}\n\nAbonelikten çıkmak için: ${unsubscribeUrl}`,
  };
}
