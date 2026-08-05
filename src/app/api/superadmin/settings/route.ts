import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Platform ayarlarını getir (şimdilik environment variables'dan)
    const settings = {
      platform: {
        name: process.env.PLATFORM_NAME || "SonBirSöz SaaS",
        domain: process.env.BASE_DOMAIN || "sonbirsoz-saas.com",
        supportEmail: process.env.SUPPORT_EMAIL || "destek@sonbirsoz-saas.com",
        logoUrl: process.env.PLATFORM_LOGO || null,
      },
      features: {
        allowSignup: process.env.ALLOW_SIGNUP !== "false",
        requireEmailVerification: process.env.REQUIRE_EMAIL_VERIFICATION === "true",
        maintenanceMode: process.env.MAINTENANCE_MODE === "true",
      },
      limits: {
        maxTenantsPerUser: parseInt(process.env.MAX_TENANTS_PER_USER || "5"),
        trialDays: parseInt(process.env.TRIAL_DAYS || "14"),
      },
      integrations: {
        stripeConfigured: !!process.env.STRIPE_SECRET_KEY,
        awsConfigured: !!process.env.AWS_ACCESS_KEY_ID,
        openaiConfigured: !!process.env.OPENAI_API_KEY,
        googleAnalyticsId: process.env.NEXT_PUBLIC_GA_ID || null,
      },
      email: {
        provider: process.env.EMAIL_PROVIDER || "none",
        fromAddress: process.env.EMAIL_FROM || null,
      },
    };

    // İstatistikler
    const [totalTenants, totalUsers, totalArticles] = await Promise.all([
      prisma.tenant.count(),
      prisma.user.count(),
      prisma.article.count(),
    ]);

    return NextResponse.json({
      settings,
      stats: {
        totalTenants,
        totalUsers,
        totalArticles,
      },
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Ayarlar yüklenirken hata oluştu" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    
    // Not: Gerçek uygulamada bu ayarlar veritabanında saklanmalı
    // Şimdilik sadece başarılı yanıt dönüyoruz
    console.log("Platform settings update requested:", body);

    return NextResponse.json({
      success: true,
      message: "Ayarlar güncellendi (demo mode - değişiklikler kalıcı değil)",
    });
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Ayarlar güncellenirken hata oluştu" },
      { status: 500 }
    );
  }
}
