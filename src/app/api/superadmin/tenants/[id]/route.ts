import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return null;
  }
  return session.user;
}

const updateTenantSchema = z.object({
  name: z.string().min(2).optional(),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/).optional(),
  domain: z.string().nullable().optional(),
  plan: z.enum(["STARTER", "PROFESSIONAL", "ENTERPRISE"]).optional(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  isActive: z.boolean().optional(),
  logo: z.string().nullable().optional(),
  favicon: z.string().nullable().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireSuperAdmin();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        settings: true,
        subscription: true,
        _count: {
          select: {
            articles: true,
            users: true,
            categories: true,
            authors: true,
            media: true,
          },
        },
        users: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant bulunamadı" }, { status: 404 });
    }

    return NextResponse.json({ data: tenant });
  } catch (error) {
    console.error("Tenant get error:", error);
    return NextResponse.json({ error: "Tenant alınamadı" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireSuperAdmin();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateTenantSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Geçersiz veri", details: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const existing = await prisma.tenant.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Tenant bulunamadı" }, { status: 404 });
    }

    const { slug, domain, plan, ...rest } = parsed.data;

    if (slug && slug !== existing.slug) {
      const conflict = await prisma.tenant.findUnique({ where: { slug } });
      if (conflict) {
        return NextResponse.json(
          { error: "Bu slug zaten kullanılıyor" },
          { status: 409 }
        );
      }
    }

    if (domain !== undefined && domain !== existing.domain) {
      if (domain) {
        const conflict = await prisma.tenant.findUnique({ where: { domain } });
        if (conflict) {
          return NextResponse.json(
            { error: "Bu domain zaten kullanılıyor" },
            { status: 409 }
          );
        }
      }
    }

    const updateData: Record<string, unknown> = { ...rest };
    if (slug) updateData.slug = slug;
    if (domain !== undefined) updateData.domain = domain;
    if (plan) {
      updateData.plan = plan;
      await prisma.tenantSettings.update({
        where: { tenantId: id },
        data: {
          aiGenerationEnabled: plan !== "STARTER",
          aiModerationEnabled: plan !== "STARTER",
          videoStudioEnabled: plan !== "STARTER",
          customDomainEnabled: plan === "ENTERPRISE",
          apiAccessEnabled: plan === "ENTERPRISE",
        },
      });
    }

    const tenant = await prisma.tenant.update({
      where: { id },
      data: updateData,
      include: {
        settings: true,
        _count: {
          select: { articles: true, users: true },
        },
      },
    });

    return NextResponse.json({ data: tenant });
  } catch (error) {
    console.error("Tenant update error:", error);
    return NextResponse.json({ error: "Tenant güncellenemedi" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireSuperAdmin();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        _count: {
          select: { articles: true, users: true },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant bulunamadı" }, { status: 404 });
    }

    if (tenant._count.articles > 0 || tenant._count.users > 0) {
      return NextResponse.json(
        {
          error: "Bu tenant'a ait veriler var. Önce verileri silin veya tenant'ı deaktif edin.",
          articleCount: tenant._count.articles,
          userCount: tenant._count.users,
        },
        { status: 409 }
      );
    }

    await prisma.tenantSettings.deleteMany({ where: { tenantId: id } });
    await prisma.tenantSubscription.deleteMany({ where: { tenantId: id } });
    await prisma.tenant.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Tenant delete error:", error);
    return NextResponse.json({ error: "Tenant silinemedi" }, { status: 500 });
  }
}
