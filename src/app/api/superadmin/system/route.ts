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
    const startTime = Date.now();

    // Veritabanı bağlantı testi
    let dbStatus = "healthy";
    let dbLatency = 0;
    try {
      const dbStart = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbLatency = Date.now() - dbStart;
    } catch {
      dbStatus = "error";
    }

    // Son 24 saat istatistikleri
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const [
      newTenantsToday,
      newUsersToday,
      newArticlesToday,
      totalTenants,
      activeTenants,
      totalUsers,
      totalArticles,
    ] = await Promise.all([
      prisma.tenant.count({ where: { createdAt: { gte: oneDayAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: oneDayAgo } } }),
      prisma.article.count({ where: { createdAt: { gte: oneDayAgo } } }),
      prisma.tenant.count(),
      prisma.tenant.count({ where: { isActive: true } }),
      prisma.user.count(),
      prisma.article.count(),
    ]);

    // Plan dağılımı
    const planDistribution = await prisma.tenant.groupBy({
      by: ["plan"],
      _count: { plan: true },
    });

    // Son aktiviteler
    const recentTenants = await prisma.tenant.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        createdAt: true,
      },
    });

    const recentUsers = await prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      status: "operational",
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: dbStatus,
          latency: dbLatency,
        },
        api: {
          status: "healthy",
          responseTime,
        },
      },
      metrics: {
        today: {
          newTenants: newTenantsToday,
          newUsers: newUsersToday,
          newArticles: newArticlesToday,
        },
        total: {
          tenants: totalTenants,
          activeTenants,
          users: totalUsers,
          articles: totalArticles,
        },
        planDistribution: planDistribution.reduce(
          (acc, item) => {
            acc[item.plan] = item._count.plan;
            return acc;
          },
          {} as Record<string, number>
        ),
      },
      recentActivity: {
        tenants: recentTenants,
        users: recentUsers,
      },
    });
  } catch (error) {
    console.error("Error fetching system status:", error);
    return NextResponse.json(
      {
        status: "degraded",
        error: "Sistem durumu alınırken hata oluştu",
      },
      { status: 500 }
    );
  }
}
