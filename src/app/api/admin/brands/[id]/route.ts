import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireEditor } from "@/lib/data/article-mutations";
import { requireTenantId } from "@/lib/tenant";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
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

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const user = await requireEditor();
  if (!user) return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });

  const { id } = await params;
  const tenantId = await requireTenantId();

  const brand = await prisma.brand.findFirst({
    where: { id, tenantId },
    include: {
      socialAccounts: true,
      contentSources: true,
      _count: { select: { brandPosts: true } },
    },
  });

  if (!brand) return NextResponse.json({ error: "Marka bulunamadı" }, { status: 404 });
  return NextResponse.json({ data: brand });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await requireEditor();
  if (!user) return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });

  const { id } = await params;
  const tenantId = await requireTenantId();

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz veri", details: parsed.error.issues }, { status: 400 });
  }

  const brand = await prisma.brand.findFirst({ where: { id, tenantId } });
  if (!brand) return NextResponse.json({ error: "Marka bulunamadı" }, { status: 404 });

  const updated = await prisma.brand.update({
    where: { id },
    data: { ...parsed.data, updatedAt: new Date() },
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await requireEditor();
  if (!user) return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });

  const { id } = await params;
  const tenantId = await requireTenantId();

  const brand = await prisma.brand.findFirst({ where: { id, tenantId } });
  if (!brand) return NextResponse.json({ error: "Marka bulunamadı" }, { status: 404 });

  await prisma.brand.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
