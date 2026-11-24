/**
 * Tekil BrandPost işlemleri
 * GET    /api/admin/brand-posts/[id]        — detay
 * PATCH  /api/admin/brand-posts/[id]        — onayla / reddet / zamanla / caption güncelle
 * DELETE /api/admin/brand-posts/[id]        — sil
 *
 * PATCH body örnekleri:
 *   { action: "approve" }
 *   { action: "reject", rejectionNote: "..." }
 *   { action: "schedule", scheduledAt: "2026-11-25T17:00:00Z", accountId: "..." }
 *   { action: "update", caption: "...", imageUrl: "..." }
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireEditor } from "@/lib/data/article-mutations";
import { requireTenantId } from "@/lib/tenant";
import { validateCrimeChecklist, type CrimeChecklistKey } from "@/lib/social/legal-guard";

const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve"), crimeChecklist: z.record(z.string(), z.boolean()).optional() }),
  z.object({ action: z.literal("reject"), rejectionNote: z.string().min(1) }),
  z.object({
    action: z.literal("schedule"),
    scheduledAt: z.string().datetime(),
    accountId: z.string().optional(),
  }),
  z.object({
    action: z.literal("update"),
    caption: z.string().optional(),
    imageUrl: z.string().optional().nullable(),
    scheduledAt: z.string().datetime().optional().nullable(),
  }),
]);

type Params = { params: Promise<{ id: string }> };

async function getBrandPost(id: string, tenantId: string) {
  return prisma.brandPost.findFirst({
    where: { id, brand: { tenantId } },
    include: { brand: { select: { contentPolicy: true, requiresApproval: true } } },
  });
}

export async function GET(_request: NextRequest, { params }: Params) {
  const user = await requireEditor();
  if (!user) return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  const { id } = await params;
  const tenantId = await requireTenantId();

  const post = await getBrandPost(id, tenantId);
  if (!post) return NextResponse.json({ error: "Gönderi bulunamadı" }, { status: 404 });
  return NextResponse.json({ data: post });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await requireEditor();
  if (!user) return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  const { id } = await params;
  const tenantId = await requireTenantId();

  const post = await getBrandPost(id, tenantId);
  if (!post) return NextResponse.json({ error: "Gönderi bulunamadı" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz veri", details: parsed.error.issues }, { status: 400 });
  }

  if (parsed.data.action === "approve") {
    // Suç politikasında 5 madde kontrol listesi zorunlu
    if (post.brand.contentPolicy === "CRIME") {
      const checklist = (parsed.data.crimeChecklist ?? {}) as Partial<Record<CrimeChecklistKey, boolean>>;
      const { valid, missing } = validateCrimeChecklist(checklist);
      if (!valid) {
        return NextResponse.json(
          { error: "Suç hesabı onayı için 5 madde kontrol listesi tamamlanmalı", missing },
          { status: 422 }
        );
      }
    }

    const updated = await prisma.brandPost.update({
      where: { id },
      data: { status: "APPROVED", rejectionNote: null, updatedAt: new Date() },
    });
    return NextResponse.json({ data: updated });
  }

  if (parsed.data.action === "reject") {
    const updated = await prisma.brandPost.update({
      where: { id },
      data: { status: "REJECTED", rejectionNote: parsed.data.rejectionNote, updatedAt: new Date() },
    });
    return NextResponse.json({ data: updated });
  }

  if (parsed.data.action === "schedule") {
    const updated = await prisma.brandPost.update({
      where: { id },
      data: {
        status: "SCHEDULED",
        scheduledAt: new Date(parsed.data.scheduledAt),
        accountId: parsed.data.accountId ?? undefined,
        updatedAt: new Date(),
      },
    });
    return NextResponse.json({ data: updated });
  }

  if (parsed.data.action === "update") {
    const updated = await prisma.brandPost.update({
      where: { id },
      data: {
        ...(parsed.data.caption !== undefined ? { caption: parsed.data.caption } : {}),
        ...(parsed.data.imageUrl !== undefined ? { imageUrl: parsed.data.imageUrl } : {}),
        ...(parsed.data.scheduledAt !== undefined
          ? { scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null }
          : {}),
        updatedAt: new Date(),
      },
    });
    return NextResponse.json({ data: updated });
  }

  return NextResponse.json({ error: "Geçersiz aksiyon" }, { status: 400 });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await requireEditor();
  if (!user) return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  const { id } = await params;
  const tenantId = await requireTenantId();

  const post = await getBrandPost(id, tenantId);
  if (!post) return NextResponse.json({ error: "Gönderi bulunamadı" }, { status: 404 });

  await prisma.brandPost.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
