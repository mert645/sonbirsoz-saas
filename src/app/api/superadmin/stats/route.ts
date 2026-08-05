import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return null;
  }
  return session.user;
}

export async function GET() {
  const user = await requireSuperAdmin();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [
      totalTenants,
      activeTenants,
      totalUsers,
      totalArticles,
      recentTenants,
      planDistribution,
    ] = await Promise.all([
      prisma.tenant.count(),
      prisma.tenant.count({ where: { isActive: true } }),
      prisma.user.count(),
      prisma.article.count(),
      prisma.tenant.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          slug: true,
          plan: true,
          createdAt: true,
          _count: {
            select: {
              articles: true,
              users: true,
            },
          },
        },
      }),
      prisma.tenant.groupBy({
        by: ["plan"],
        _count: { _all: true },
      }),
    ]);

    return NextResponse.json({
      totalTenants,
      activeTenants,
      totalUsers,
      totalArticles,
      recentTenants,
      planDistribution,
    });
  } catch (error) {
    console.error("Super admin stats error:", error);
    return NextResponse.json(
      { error: "İstatistikler alınamadı" },
      { status: 500 }
    );
  }
}
