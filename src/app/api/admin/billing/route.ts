import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCurrentTenantId } from "@/lib/tenant/get-tenant";
import { getTenantUsageSummary, PLAN_PRICING, PLAN_NAMES, PLAN_DESCRIPTIONS } from "@/lib/billing";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tenantId = await getCurrentTenantId();
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant bulunamadı" }, { status: 404 });
    }

    // Kullanım özeti
    const usageSummary = await getTenantUsageSummary(tenantId);
    if (!usageSummary) {
      return NextResponse.json({ error: "Kullanım bilgisi alınamadı" }, { status: 500 });
    }

    // Tenant ve subscription bilgileri
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        subscription: true,
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant bulunamadı" }, { status: 404 });
    }

    // Plan bilgileri
    const currentPlan = {
      id: tenant.plan,
      name: PLAN_NAMES[tenant.plan],
      description: PLAN_DESCRIPTIONS[tenant.plan],
      pricing: PLAN_PRICING[tenant.plan],
    };

    // Mevcut planlar (upgrade seçenekleri)
    const availablePlans = Object.entries(PLAN_NAMES).map(([id, name]) => ({
      id,
      name,
      description: PLAN_DESCRIPTIONS[id as keyof typeof PLAN_DESCRIPTIONS],
      pricing: PLAN_PRICING[id as keyof typeof PLAN_PRICING],
      isCurrent: id === tenant.plan,
    }));

    return NextResponse.json({
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        plan: tenant.plan,
      },
      subscription: tenant.subscription
        ? {
            status: tenant.subscription.status,
            currentPeriodStart: tenant.subscription.currentPeriodStart,
            currentPeriodEnd: tenant.subscription.currentPeriodEnd,
            cancelAtPeriodEnd: tenant.subscription.cancelAtPeriodEnd,
            trialEndsAt: tenant.subscription.trialEndsAt,
          }
        : null,
      currentPlan,
      availablePlans,
      usage: usageSummary.usage,
      features: usageSummary.features,
      period: usageSummary.period,
    });
  } catch (error) {
    console.error("Error fetching billing info:", error);
    return NextResponse.json(
      { error: "Billing bilgileri yüklenirken hata oluştu" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tenantId = await getCurrentTenantId();
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant bulunamadı" }, { status: 404 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === "request_upgrade") {
      const { targetPlan } = body;
      
      // Gerçek uygulamada burada Stripe checkout session oluşturulur
      // Şimdilik sadece bir istek kaydı oluşturuyoruz
      
      console.log(`Upgrade request: ${tenantId} -> ${targetPlan}`);
      
      return NextResponse.json({
        success: true,
        message: "Plan yükseltme isteğiniz alındı. Kısa süre içinde sizinle iletişime geçeceğiz.",
        // Gerçek uygulamada: checkoutUrl: stripeSession.url
      });
    }

    if (action === "cancel_subscription") {
      // Aboneliği dönem sonunda iptal et
      await prisma.tenantSubscription.update({
        where: { tenantId },
        data: { cancelAtPeriodEnd: true },
      });

      return NextResponse.json({
        success: true,
        message: "Aboneliğiniz dönem sonunda iptal edilecek.",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error processing billing action:", error);
    return NextResponse.json(
      { error: "İşlem sırasında hata oluştu" },
      { status: 500 }
    );
  }
}
