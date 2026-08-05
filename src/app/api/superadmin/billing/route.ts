import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAllTenantsUsage, PLAN_PRICING, PLAN_NAMES } from "@/lib/billing";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view") || "overview";

  try {
    if (view === "overview") {
      // Genel istatistikler
      const [
        totalTenants,
        activeSubscriptions,
        trialingTenants,
        planDistribution,
      ] = await Promise.all([
        prisma.tenant.count(),
        prisma.tenantSubscription.count({ where: { status: "ACTIVE" } }),
        prisma.tenantSubscription.count({ where: { status: "TRIALING" } }),
        prisma.tenant.groupBy({
          by: ["plan"],
          _count: { plan: true },
        }),
      ]);

      // Tahmini MRR (Monthly Recurring Revenue)
      let estimatedMRR = 0;
      for (const dist of planDistribution) {
        const pricing = PLAN_PRICING[dist.plan];
        if (pricing && dist.plan !== "ENTERPRISE") {
          estimatedMRR += pricing.monthly * dist._count.plan;
        }
      }

      // Son 30 günde oluşturulan tenant'lar
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const newTenantsLast30Days = await prisma.tenant.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      });

      return NextResponse.json({
        overview: {
          totalTenants,
          activeSubscriptions,
          trialingTenants,
          newTenantsLast30Days,
          estimatedMRR,
          currency: "TRY",
        },
        planDistribution: planDistribution.map((d) => ({
          plan: d.plan,
          name: PLAN_NAMES[d.plan],
          count: d._count.plan,
          pricing: PLAN_PRICING[d.plan],
        })),
      });
    }

    if (view === "subscriptions") {
      // Tüm abonelikler
      const subscriptions = await prisma.tenantSubscription.findMany({
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true,
              plan: true,
              isActive: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json({ subscriptions });
    }

    if (view === "usage") {
      // Kullanım detayları
      const tenantsUsage = await getAllTenantsUsage();
      return NextResponse.json({ tenantsUsage });
    }

    return NextResponse.json({ error: "Invalid view" }, { status: 400 });
  } catch (error) {
    console.error("Error fetching billing data:", error);
    return NextResponse.json(
      { error: "Billing verileri yüklenirken hata oluştu" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, tenantId, plan, status } = body;

    if (action === "change_plan") {
      if (!tenantId || !plan) {
        return NextResponse.json(
          { error: "tenantId ve plan gerekli" },
          { status: 400 }
        );
      }

      // Tenant'ın planını güncelle
      const tenant = await prisma.tenant.update({
        where: { id: tenantId },
        data: { plan },
      });

      // Subscription'ı güncelle veya oluştur
      await prisma.tenantSubscription.upsert({
        where: { tenantId },
        update: { plan, status: "ACTIVE" },
        create: {
          tenantId,
          plan,
          status: "ACTIVE",
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      // TenantSettings'i plana göre güncelle
      const isPro = plan === "PROFESSIONAL" || plan === "ENTERPRISE";
      const isEnterprise = plan === "ENTERPRISE";

      await prisma.tenantSettings.update({
        where: { tenantId },
        data: {
          aiGenerationEnabled: isPro,
          aiModerationEnabled: isPro,
          videoStudioEnabled: isPro,
          customDomainEnabled: isEnterprise,
          apiAccessEnabled: isEnterprise,
        },
      });

      return NextResponse.json({
        success: true,
        tenant,
        message: `Plan ${PLAN_NAMES[plan]} olarak güncellendi`,
      });
    }

    if (action === "update_status") {
      if (!tenantId || !status) {
        return NextResponse.json(
          { error: "tenantId ve status gerekli" },
          { status: 400 }
        );
      }

      const subscription = await prisma.tenantSubscription.update({
        where: { tenantId },
        data: { status },
      });

      // Eğer iptal edildiyse tenant'ı deaktif et
      if (status === "CANCELED") {
        await prisma.tenant.update({
          where: { id: tenantId },
          data: { isActive: false },
        });
      }

      return NextResponse.json({ success: true, subscription });
    }

    if (action === "extend_trial") {
      if (!tenantId) {
        return NextResponse.json(
          { error: "tenantId gerekli" },
          { status: 400 }
        );
      }

      const newTrialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

      const subscription = await prisma.tenantSubscription.update({
        where: { tenantId },
        data: {
          status: "TRIALING",
          trialEndsAt: newTrialEnd,
        },
      });

      return NextResponse.json({
        success: true,
        subscription,
        message: "Deneme süresi 14 gün uzatıldı",
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
