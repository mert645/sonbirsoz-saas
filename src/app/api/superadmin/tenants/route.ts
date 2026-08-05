import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return null;
  }
  return session.user;
}

const createTenantSchema = z.object({
  name: z.string().min(2, "İsim en az 2 karakter olmalı"),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, "Slug sadece küçük harf, rakam ve tire içerebilir"),
  domain: z.string().optional().nullable(),
  plan: z.enum(["STARTER", "PROFESSIONAL", "ENTERPRISE"]).default("STARTER"),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#4F46E5"),
});

const updateTenantSchema = createTenantSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  const user = await requireSuperAdmin();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(50, Math.max(10, parseInt(searchParams.get("limit") || "20")));
  const search = searchParams.get("search") || "";
  const plan = searchParams.get("plan") || "";
  const status = searchParams.get("status") || "";

  const where: Record<string, unknown> = {};
  
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { slug: { contains: search, mode: "insensitive" } },
      { domain: { contains: search, mode: "insensitive" } },
    ];
  }
  
  if (plan && ["STARTER", "PROFESSIONAL", "ENTERPRISE"].includes(plan)) {
    where.plan = plan;
  }
  
  if (status === "active") {
    where.isActive = true;
  } else if (status === "inactive") {
    where.isActive = false;
  }

  try {
    const [tenants, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: {
            select: {
              articles: true,
              users: true,
              categories: true,
            },
          },
          subscription: {
            select: {
              status: true,
              currentPeriodEnd: true,
            },
          },
        },
      }),
      prisma.tenant.count({ where }),
    ]);

    return NextResponse.json({
      data: tenants,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Tenant list error:", error);
    return NextResponse.json({ error: "Tenant listesi alınamadı" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await requireSuperAdmin();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createTenantSchema.safeParse(body);
  
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Geçersiz veri", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { name, slug, domain, plan, primaryColor } = parsed.data;

  try {
    const existingSlug = await prisma.tenant.findUnique({ where: { slug } });
    if (existingSlug) {
      return NextResponse.json(
        { error: "Bu slug zaten kullanılıyor" },
        { status: 409 }
      );
    }

    if (domain) {
      const existingDomain = await prisma.tenant.findUnique({ where: { domain } });
      if (existingDomain) {
        return NextResponse.json(
          { error: "Bu domain zaten kullanılıyor" },
          { status: 409 }
        );
      }
    }

    const tenant = await prisma.tenant.create({
      data: {
        name,
        slug,
        domain: domain || null,
        plan,
        primaryColor,
        settings: {
          create: {
            siteName: name,
            newsletterEnabled: true,
            pushEnabled: true,
            aiGenerationEnabled: plan !== "STARTER",
            aiModerationEnabled: plan !== "STARTER",
            videoStudioEnabled: plan !== "STARTER",
            customDomainEnabled: plan === "ENTERPRISE",
            apiAccessEnabled: plan === "ENTERPRISE",
          },
        },
      },
      include: {
        settings: true,
        _count: {
          select: { articles: true, users: true },
        },
      },
    });

    return NextResponse.json({ data: tenant }, { status: 201 });
  } catch (error) {
    console.error("Tenant create error:", error);
    return NextResponse.json({ error: "Tenant oluşturulamadı" }, { status: 500 });
  }
}
