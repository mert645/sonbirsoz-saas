import { NextResponse } from "next/server";
import {
  invitationEmail,
  welcomeEmail,
  passwordResetEmail,
  securityAlertEmail,
  articlePublishedEmail,
  newCommentEmail,
  subscriptionStatusEmail,
  dataExportReadyEmail,
} from "@/lib/email/templates";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const template = searchParams.get("template") || "invitation";

  const templates: Record<string, string> = {
    invitation: invitationEmail({
      inviteeName: "Yeni Kullanıcı",
      inviterName: "Ahmet Yılmaz",
      tenantName: "Demo Haber",
      role: "EDITOR",
      inviteUrl: "http://localhost:3000/invite?token=test123",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString("tr-TR"),
      siteName: "SonBirSöz",
      primaryColor: "#dc2626",
    }),
    welcome: welcomeEmail({
      userName: "Mehmet Demir",
      tenantName: "Demo Haber",
      loginUrl: "http://localhost:3000/admin/dashboard",
      siteName: "SonBirSöz",
      primaryColor: "#dc2626",
    }),
    passwordReset: passwordResetEmail({
      userName: "Ayşe Kaya",
      resetUrl: "http://localhost:3000/reset-password?token=abc123",
      expiresIn: "1 saat",
      siteName: "SonBirSöz",
      primaryColor: "#dc2626",
    }),
    security: securityAlertEmail({
      userName: "Ali Veli",
      alertType: "new_login",
      details: "Hesabınıza yeni bir cihazdan giriş yapıldı.",
      ipAddress: "192.168.1.1",
      location: "İstanbul, Türkiye",
      timestamp: new Date().toLocaleString("tr-TR"),
      siteName: "SonBirSöz",
    }),
    articlePublished: articlePublishedEmail({
      authorName: "Zeynep Yıldız",
      articleTitle: "Yapay Zeka ve Gazetecilik: Geleceğin Haberciliği",
      articleUrl: "http://localhost:3000/teknoloji/yapay-zeka-gazetecilik",
      publishedAt: new Date().toLocaleDateString("tr-TR"),
      siteName: "SonBirSöz",
      primaryColor: "#dc2626",
    }),
    newComment: newCommentEmail({
      authorName: "Mehmet Demir",
      articleTitle: "Ekonomi Haberleri: Dolar Kuru Son Durum",
      commentAuthor: "Ahmet Yılmaz",
      commentPreview: "Çok güzel bir analiz olmuş, teşekkürler...",
      moderationUrl: "http://localhost:3000/admin/moderasyon",
      siteName: "SonBirSöz",
      primaryColor: "#dc2626",
    }),
    subscriptionUpgrade: subscriptionStatusEmail({
      tenantName: "Spor Haberleri",
      adminName: "Firma Yöneticisi",
      oldPlan: "Starter",
      newPlan: "Professional",
      status: "upgraded",
      effectiveDate: new Date().toLocaleDateString("tr-TR"),
      billingUrl: "http://localhost:3000/admin/fatura",
      siteName: "SonBirSöz",
      primaryColor: "#dc2626",
    }),
    subscriptionDowngrade: subscriptionStatusEmail({
      tenantName: "Spor Haberleri",
      adminName: "Firma Yöneticisi",
      oldPlan: "Professional",
      newPlan: "Starter",
      status: "downgraded",
      effectiveDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("tr-TR"),
      billingUrl: "http://localhost:3000/admin/fatura",
      siteName: "SonBirSöz",
      primaryColor: "#dc2626",
    }),
    dataExport: dataExportReadyEmail({
      userName: "Kullanıcı",
      downloadUrl: "http://localhost:3000/api/gdpr/download?token=xyz",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString("tr-TR"),
      siteName: "SonBirSöz",
      primaryColor: "#dc2626",
    }),
    securityLocked: securityAlertEmail({
      userName: "Ali Veli",
      alertType: "account_locked",
      details: "Çok fazla başarısız giriş denemesi nedeniyle hesabınız 15 dakika süreyle kilitlendi.",
      ipAddress: "192.168.1.100",
      timestamp: new Date().toLocaleString("tr-TR"),
      siteName: "SonBirSöz",
    }),
    securityPassword: securityAlertEmail({
      userName: "Ali Veli",
      alertType: "password_changed",
      details: "Hesap şifreniz başarıyla değiştirildi.",
      ipAddress: "192.168.1.1",
      timestamp: new Date().toLocaleString("tr-TR"),
      actionUrl: "http://localhost:3000/reset-password",
      siteName: "SonBirSöz",
    }),
  };

  const html = templates[template] || templates.invitation;

  // Template listesi için index sayfası
  if (template === "index" || template === "list") {
    const listHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Email Şablonları - Önizleme</title>
        <style>
          body { font-family: system-ui, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
          h1 { color: #1f2937; }
          .template-list { list-style: none; padding: 0; }
          .template-list li { margin: 10px 0; }
          .template-list a { 
            display: block; 
            padding: 15px 20px; 
            background: #f3f4f6; 
            border-radius: 8px; 
            text-decoration: none; 
            color: #1f2937;
            transition: background 0.2s;
          }
          .template-list a:hover { background: #e5e7eb; }
          .template-list .desc { color: #6b7280; font-size: 14px; margin-top: 4px; }
        </style>
      </head>
      <body>
        <h1>📧 Email Şablonları</h1>
        <p>Aşağıdaki şablonları önizlemek için tıklayın:</p>
        <ul class="template-list">
          <li><a href="?template=invitation">
            <strong>Davet Emaili</strong>
            <div class="desc">Yeni kullanıcı davet edildiğinde gönderilir</div>
          </a></li>
          <li><a href="?template=welcome">
            <strong>Hoş Geldiniz</strong>
            <div class="desc">Kullanıcı daveti kabul ettiğinde gönderilir</div>
          </a></li>
          <li><a href="?template=passwordReset">
            <strong>Şifre Sıfırlama</strong>
            <div class="desc">Şifre sıfırlama talebi yapıldığında gönderilir</div>
          </a></li>
          <li><a href="?template=security">
            <strong>Güvenlik Uyarısı - Yeni Giriş</strong>
            <div class="desc">Yeni cihazdan giriş yapıldığında gönderilir</div>
          </a></li>
          <li><a href="?template=securityLocked">
            <strong>Güvenlik Uyarısı - Hesap Kilitlendi</strong>
            <div class="desc">Çok fazla başarısız giriş sonrası gönderilir</div>
          </a></li>
          <li><a href="?template=securityPassword">
            <strong>Güvenlik Uyarısı - Şifre Değişti</strong>
            <div class="desc">Şifre değiştirildiğinde gönderilir</div>
          </a></li>
          <li><a href="?template=articlePublished">
            <strong>Makale Yayınlandı</strong>
            <div class="desc">Yazarın makalesi yayınlandığında gönderilir</div>
          </a></li>
          <li><a href="?template=newComment">
            <strong>Yeni Yorum</strong>
            <div class="desc">Makaleye yorum yapıldığında yazara gönderilir</div>
          </a></li>
          <li><a href="?template=subscriptionUpgrade">
            <strong>Plan Yükseltme</strong>
            <div class="desc">Abonelik planı yükseltildiğinde gönderilir</div>
          </a></li>
          <li><a href="?template=subscriptionDowngrade">
            <strong>Plan Düşürme</strong>
            <div class="desc">Abonelik planı düşürüldüğünde gönderilir</div>
          </a></li>
          <li><a href="?template=dataExport">
            <strong>Veri Export Hazır</strong>
            <div class="desc">GDPR veri exportu hazır olduğunda gönderilir</div>
          </a></li>
        </ul>
      </body>
      </html>
    `;
    return new NextResponse(listHtml, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
