import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireEditor } from "@/lib/data/article-mutations";
import { requireTenantId } from "@/lib/tenant";

const brandSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  logoUrl: z.string().url().optional().nullable(),
  voiceGuidelines: z.string().optional().nullable(),
  defaultHashtags: z.array(z.string()).optional(),
  cardLabel: z.string().optional().nullable(),
  contentPolicy: z.enum(["STANDARD", "NEWS", "CRIME"]).optional(),
  requiresApproval: z.boolean().optional(),
  dailyPostLimit: z.number().int().min(1).max(20).optional(),
  preferredTimes: z.array(z.string().regex(/^\d{2}:\d{2}$/)).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(_request: NextRequest) {
  const user = await requireEditor();
  if (!user) return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });

  const tenantId = await requireTenantId();
  const brands = await prisma.brand.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { brandPosts: true, socialAccounts: true, contentSources: true } },
      socialAccounts: { select: { id: true, platform: true, username: true, verified: true, lastError: true } },
    },
  });

  return NextResponse.json({ data: brands });
}

export async function POST(request: NextRequest) {
  const user = await requireEditor();
  if (!user) return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = brandSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz veri", details: parsed.error.issues }, { status: 400 });
  }

  const tenantId = await requireTenantId();

  // Slug benzersizlik kontrolü
  const existing = await prisma.brand.findUnique({
    where: { tenantId_slug: { tenantId, slug: parsed.data.slug } },
  });
  if (existing) {
    return NextResponse.json({ error: "Bu slug zaten kullanımda" }, { status: 409 });
  }

  const brand = await prisma.brand.create({
    data: {
      tenantId,
      name: parsed.data.name,
      slug: parsed.data.slug,
      color: parsed.data.color ?? "#4F46E5",
      logoUrl: parsed.data.logoUrl ?? null,
      voiceGuidelines: parsed.data.voiceGuidelines ?? null,
      defaultHashtags: parsed.data.defaultHashtags ?? [],
      cardLabel: parsed.data.cardLabel ?? null,
      contentPolicy: parsed.data.contentPolicy ?? "NEWS",
      requiresApproval: parsed.data.requiresApproval ?? true,
      dailyPostLimit: parsed.data.dailyPostLimit ?? 3,
      preferredTimes: parsed.data.preferredTimes ?? [],
      isActive: parsed.data.isActive ?? true,
    },
  });

  return NextResponse.json({ data: brand }, { status: 201 });
}
