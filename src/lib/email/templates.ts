/**
 * Email Template System
 * HTML email şablonları (gönderim hariç)
 */

export interface EmailTemplateData {
  [key: string]: string | number | boolean | undefined;
}

/**
 * Temel email layout'u
 */
function baseLayout(content: string, options: { 
  previewText?: string;
  primaryColor?: string;
  logoUrl?: string;
  siteName?: string;
  footerText?: string;
} = {}): string {
  const {
    previewText = "",
    primaryColor = "#4F46E5",
    logoUrl,
    siteName = "SonBirSöz",
    footerText = "Bu email otomatik olarak gönderilmiştir.",
  } = options;

  return `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${siteName}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background-color: #f3f4f6;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .card {
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .header {
      background-color: ${primaryColor};
      padding: 24px;
      text-align: center;
    }
    .header img {
      max-height: 40px;
    }
    .header h1 {
      color: #ffffff;
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .content {
      padding: 32px 24px;
    }
    .button {
      display: inline-block;
      background-color: ${primaryColor};
      color: #ffffff !important;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-weight: 600;
      margin: 16px 0;
    }
    .button:hover {
      opacity: 0.9;
    }
    .footer {
      padding: 24px;
      text-align: center;
      color: #6b7280;
      font-size: 12px;
    }
    .divider {
      border-top: 1px solid #e5e7eb;
      margin: 24px 0;
    }
    .info-box {
      background-color: #f3f4f6;
      border-radius: 6px;
      padding: 16px;
      margin: 16px 0;
    }
    .code {
      font-family: monospace;
      background-color: #f3f4f6;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 14px;
    }
    @media only screen and (max-width: 600px) {
      .container {
        padding: 10px;
      }
      .content {
        padding: 24px 16px;
      }
    }
  </style>
</head>
<body>
  ${previewText ? `<div style="display:none;max-height:0;overflow:hidden;">${previewText}</div>` : ""}
  <div class="container">
    <div class="card">
      <div class="header">
        ${logoUrl ? `<img src="${logoUrl}" alt="${siteName}">` : `<h1>${siteName}</h1>`}
      </div>
      <div class="content">
        ${content}
      </div>
      <div class="footer">
        <p>${footerText}</p>
        <p>&copy; ${new Date().getFullYear()} ${siteName}. Tüm hakları saklıdır.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Davet emaili şablonu
 */
export function invitationEmail(data: {
  inviteeName: string;
  inviterName: string;
  tenantName: string;
  role: string;
  inviteUrl: string;
  expiresAt: string;
  siteName?: string;
  primaryColor?: string;
  logoUrl?: string;
}): string {
  const roleNames: Record<string, string> = {
    OWNER: "Sahip",
    ADMIN: "Yönetici",
    EDITOR: "Editör",
    AUTHOR: "Yazar",
  };

  const content = `
    <h2 style="margin-top: 0;">Merhaba${data.inviteeName ? ` ${data.inviteeName}` : ""},</h2>
    
    <p><strong>${data.inviterName}</strong> sizi <strong>${data.tenantName}</strong> ekibine 
    <strong>${roleNames[data.role] || data.role}</strong> olarak davet etti.</p>
    
    <p>Daveti kabul etmek için aşağıdaki butona tıklayın:</p>
    
    <div style="text-align: center;">
      <a href="${data.inviteUrl}" class="button">Daveti Kabul Et</a>
    </div>
    
    <div class="info-box">
      <p style="margin: 0;"><strong>Önemli:</strong> Bu davet <strong>${data.expiresAt}</strong> tarihine kadar geçerlidir.</p>
    </div>
    
    <p style="color: #6b7280; font-size: 14px;">
      Eğer bu daveti beklemiyorsanız, bu emaili görmezden gelebilirsiniz.
    </p>
  `;

  return baseLayout(content, {
    previewText: `${data.inviterName} sizi ${data.tenantName} ekibine davet etti`,
    siteName: data.siteName,
    primaryColor: data.primaryColor,
    logoUrl: data.logoUrl,
  });
}

/**
 * Hoş geldiniz emaili şablonu
 */
export function welcomeEmail(data: {
  userName: string;
  tenantName: string;
  loginUrl: string;
  siteName?: string;
  primaryColor?: string;
  logoUrl?: string;
}): string {
  const content = `
    <h2 style="margin-top: 0;">Hoş Geldiniz, ${data.userName}!</h2>
    
    <p><strong>${data.tenantName}</strong> ekibine katıldığınız için teşekkür ederiz.</p>
    
    <p>Artık içerik oluşturabilir, düzenleyebilir ve yayınlayabilirsiniz.</p>
    
    <div style="text-align: center;">
      <a href="${data.loginUrl}" class="button">Panele Git</a>
    </div>
    
    <div class="divider"></div>
    
    <h3>Hızlı Başlangıç</h3>
    <ul>
      <li>Dashboard'dan genel durumu görüntüleyin</li>
      <li>Yeni bir makale oluşturun</li>
      <li>Medya kütüphanesine görseller yükleyin</li>
      <li>Ayarlardan profilinizi düzenleyin</li>
    </ul>
  `;

  return baseLayout(content, {
    previewText: `${data.tenantName} ekibine hoş geldiniz!`,
    siteName: data.siteName,
    primaryColor: data.primaryColor,
    logoUrl: data.logoUrl,
  });
}

/**
 * Şifre sıfırlama emaili şablonu
 */
export function passwordResetEmail(data: {
  userName: string;
  resetUrl: string;
  expiresIn: string;
  ipAddress?: string;
  siteName?: string;
  primaryColor?: string;
  logoUrl?: string;
}): string {
  const content = `
    <h2 style="margin-top: 0;">Şifre Sıfırlama</h2>
    
    <p>Merhaba ${data.userName},</p>
    
    <p>Hesabınız için şifre sıfırlama talebinde bulunuldu.</p>
    
    <div style="text-align: center;">
      <a href="${data.resetUrl}" class="button">Şifremi Sıfırla</a>
    </div>
    
    <div class="info-box">
      <p style="margin: 0;">Bu link <strong>${data.expiresIn}</strong> süreyle geçerlidir.</p>
    </div>
    
    ${data.ipAddress ? `
    <p style="color: #6b7280; font-size: 14px;">
      Bu istek <code class="code">${data.ipAddress}</code> IP adresinden yapıldı.
    </p>
    ` : ""}
    
    <p style="color: #6b7280; font-size: 14px;">
      Eğer bu talebi siz yapmadıysanız, bu emaili görmezden gelebilirsiniz. 
      Şifreniz değişmeyecektir.
    </p>
  `;

  return baseLayout(content, {
    previewText: "Şifre sıfırlama talebiniz",
    siteName: data.siteName,
    primaryColor: data.primaryColor,
    logoUrl: data.logoUrl,
  });
}

/**
 * Makale yayınlandı bildirimi
 */
export function articlePublishedEmail(data: {
  authorName: string;
  articleTitle: string;
  articleUrl: string;
  publishedAt: string;
  siteName?: string;
  primaryColor?: string;
  logoUrl?: string;
}): string {
  const content = `
    <h2 style="margin-top: 0;">Makaleniz Yayınlandı!</h2>
    
    <p>Merhaba ${data.authorName},</p>
    
    <p>Makaleniz başarıyla yayınlandı:</p>
    
    <div class="info-box">
      <h3 style="margin-top: 0;">${data.articleTitle}</h3>
      <p style="margin-bottom: 0; color: #6b7280;">Yayın tarihi: ${data.publishedAt}</p>
    </div>
    
    <div style="text-align: center;">
      <a href="${data.articleUrl}" class="button">Makaleyi Görüntüle</a>
    </div>
  `;

  return baseLayout(content, {
    previewText: `"${data.articleTitle}" yayınlandı`,
    siteName: data.siteName,
    primaryColor: data.primaryColor,
    logoUrl: data.logoUrl,
  });
}

/**
 * Yeni yorum bildirimi
 */
export function newCommentEmail(data: {
  authorName: string;
  articleTitle: string;
  commentAuthor: string;
  commentPreview: string;
  moderationUrl: string;
  siteName?: string;
  primaryColor?: string;
  logoUrl?: string;
}): string {
  const content = `
    <h2 style="margin-top: 0;">Yeni Yorum</h2>
    
    <p>Merhaba ${data.authorName},</p>
    
    <p><strong>"${data.articleTitle}"</strong> başlıklı makalenize yeni bir yorum yapıldı:</p>
    
    <div class="info-box">
      <p style="margin: 0;"><strong>${data.commentAuthor}</strong> yazdı:</p>
      <p style="margin-bottom: 0; font-style: italic;">"${data.commentPreview}"</p>
    </div>
    
    <div style="text-align: center;">
      <a href="${data.moderationUrl}" class="button">Yorumu İncele</a>
    </div>
  `;

  return baseLayout(content, {
    previewText: `${data.commentAuthor} makalenize yorum yaptı`,
    siteName: data.siteName,
    primaryColor: data.primaryColor,
    logoUrl: data.logoUrl,
  });
}

/**
 * Abonelik durumu değişikliği
 */
export function subscriptionStatusEmail(data: {
  tenantName: string;
  adminName: string;
  oldPlan: string;
  newPlan: string;
  status: "upgraded" | "downgraded" | "canceled" | "renewed";
  effectiveDate: string;
  billingUrl: string;
  siteName?: string;
  primaryColor?: string;
  logoUrl?: string;
}): string {
  const statusMessages = {
    upgraded: `Planınız <strong>${data.oldPlan}</strong>'dan <strong>${data.newPlan}</strong>'a yükseltildi.`,
    downgraded: `Planınız <strong>${data.oldPlan}</strong>'dan <strong>${data.newPlan}</strong>'a düşürüldü.`,
    canceled: `<strong>${data.oldPlan}</strong> planınız iptal edildi.`,
    renewed: `<strong>${data.newPlan}</strong> planınız yenilendi.`,
  };

  const content = `
    <h2 style="margin-top: 0;">Abonelik Güncellendi</h2>
    
    <p>Merhaba ${data.adminName},</p>
    
    <p><strong>${data.tenantName}</strong> için abonelik durumunuz güncellendi:</p>
    
    <div class="info-box">
      <p style="margin: 0;">${statusMessages[data.status]}</p>
      <p style="margin-bottom: 0; color: #6b7280;">Geçerlilik: ${data.effectiveDate}</p>
    </div>
    
    <div style="text-align: center;">
      <a href="${data.billingUrl}" class="button">Fatura Detayları</a>
    </div>
  `;

  return baseLayout(content, {
    previewText: `${data.tenantName} abonelik durumu güncellendi`,
    siteName: data.siteName,
    primaryColor: data.primaryColor,
    logoUrl: data.logoUrl,
  });
}

/**
 * GDPR veri export hazır bildirimi
 */
export function dataExportReadyEmail(data: {
  userName: string;
  downloadUrl: string;
  expiresAt: string;
  siteName?: string;
  primaryColor?: string;
  logoUrl?: string;
}): string {
  const content = `
    <h2 style="margin-top: 0;">Veri Export'unuz Hazır</h2>
    
    <p>Merhaba ${data.userName},</p>
    
    <p>Talep ettiğiniz veri export'u hazırlandı ve indirmeye hazır.</p>
    
    <div style="text-align: center;">
      <a href="${data.downloadUrl}" class="button">Verileri İndir</a>
    </div>
    
    <div class="info-box">
      <p style="margin: 0;"><strong>Önemli:</strong> Bu indirme linki <strong>${data.expiresAt}</strong> tarihine kadar geçerlidir.</p>
    </div>
    
    <p style="color: #6b7280; font-size: 14px;">
      Güvenliğiniz için, indirme linkini başkalarıyla paylaşmayın.
    </p>
  `;

  return baseLayout(content, {
    previewText: "Veri export'unuz indirmeye hazır",
    siteName: data.siteName,
    primaryColor: data.primaryColor,
    logoUrl: data.logoUrl,
  });
}

/**
 * Güvenlik uyarısı emaili
 */
export function securityAlertEmail(data: {
  userName: string;
  alertType: "new_login" | "password_changed" | "suspicious_activity" | "account_locked";
  details: string;
  ipAddress?: string;
  location?: string;
  timestamp: string;
  actionUrl?: string;
  siteName?: string;
  primaryColor?: string;
  logoUrl?: string;
}): string {
  const alertTitles = {
    new_login: "Yeni Giriş Tespit Edildi",
    password_changed: "Şifreniz Değiştirildi",
    suspicious_activity: "Şüpheli Aktivite Tespit Edildi",
    account_locked: "Hesabınız Kilitlendi",
  };

  const content = `
    <h2 style="margin-top: 0; color: #dc2626;">⚠️ ${alertTitles[data.alertType]}</h2>
    
    <p>Merhaba ${data.userName},</p>
    
    <p>${data.details}</p>
    
    <div class="info-box" style="background-color: #fef2f2; border: 1px solid #fecaca;">
      <p style="margin: 0;"><strong>Tarih:</strong> ${data.timestamp}</p>
      ${data.ipAddress ? `<p style="margin: 8px 0 0 0;"><strong>IP Adresi:</strong> ${data.ipAddress}</p>` : ""}
      ${data.location ? `<p style="margin: 8px 0 0 0;"><strong>Konum:</strong> ${data.location}</p>` : ""}
    </div>
    
    ${data.actionUrl ? `
    <div style="text-align: center;">
      <a href="${data.actionUrl}" class="button" style="background-color: #dc2626;">Hesabımı Güvenceye Al</a>
    </div>
    ` : ""}
    
    <p style="color: #6b7280; font-size: 14px;">
      Eğer bu işlemi siz yaptıysanız, bu emaili görmezden gelebilirsiniz.
      Aksi halde, lütfen hemen şifrenizi değiştirin.
    </p>
  `;

  return baseLayout(content, {
    previewText: `Güvenlik Uyarısı: ${alertTitles[data.alertType]}`,
    siteName: data.siteName,
    primaryColor: "#dc2626",
    logoUrl: data.logoUrl,
  });
}

// ─── LEGACY EMAIL FUNCTIONS (Backward Compatibility) ───

export interface BulletinArticle {
  title: string;
  spot: string | null;
  url: string;
  imageUrl?: string;
}

/**
 * Son dakika haber emaili (legacy)
 */
export function breakingEmail(
  title: string,
  spot: string | null,
  articleUrl: string,
  unsubscribeUrl: string
): { subject: string; html: string } {
  const content = `
    <h2 style="margin-top: 0; color: #dc2626;">🔴 Son Dakika</h2>
    
    <h3 style="font-size: 1.5rem; margin-bottom: 16px;">${title}</h3>
    
    ${spot ? `<p style="color: #4b5563; margin-bottom: 24px;">${spot}</p>` : ""}
    
    <div style="text-align: center;">
      <a href="${articleUrl}" class="button">Haberi Oku</a>
    </div>
    
    <div class="divider"></div>
    
    <p style="color: #9ca3af; font-size: 12px; text-align: center;">
      <a href="${unsubscribeUrl}" style="color: #9ca3af;">Abonelikten çık</a>
    </p>
  `;

  return {
    subject: `🔴 Son Dakika: ${title}`,
    html: baseLayout(content, {
      previewText: `Son Dakika: ${title}`,
      primaryColor: "#dc2626",
    }),
  };
}

/**
 * Günlük bülten emaili (legacy)
 */
export function dailyBulletinEmail(
  articles: BulletinArticle[],
  unsubscribeUrl: string
): { subject: string; html: string } {
  const today = new Date().toLocaleDateString("tr-TR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const articlesList = articles
    .map(
      (article) => `
      <div style="margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid #e5e7eb;">
        <h3 style="margin: 0 0 8px 0;">
          <a href="${article.url}" style="color: #1f2937; text-decoration: none;">${article.title}</a>
        </h3>
        ${article.spot ? `<p style="color: #6b7280; margin: 0;">${article.spot}</p>` : ""}
      </div>
    `
    )
    .join("");

  const content = `
    <h2 style="margin-top: 0;">📰 Günün Özeti</h2>
    <p style="color: #6b7280;">${today}</p>
    
    <div class="divider"></div>
    
    ${articlesList}
    
    <p style="color: #9ca3af; font-size: 12px; text-align: center;">
      <a href="${unsubscribeUrl}" style="color: #9ca3af;">Abonelikten çık</a>
    </p>
  `;

  return {
    subject: `📰 Günün Özeti - ${today}`,
    html: baseLayout(content, {
      previewText: `Bugünün en önemli haberleri`,
    }),
  };
}
