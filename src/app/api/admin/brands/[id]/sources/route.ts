/**
 * ContentSource CRUD + manuel tetikleme
 * GET  /api/admin/brands/[id]/sources        — kaynak listesi
 * POST /api/admin/brands/[id]/sources        — yeni kaynak ekle
 * POST /api/admin/brands/[id]/sources/run    — tüm kaynakları şimdi tetikle
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireEditor } from "@/lib/data/article-mutations";
import { requireTenantId } from "@/lib/tenant";
import { ingestContentSource } from "@/lib/social/content-source-ingest";

const sourceSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  keywords: z.array(z.string()).optional(),
  excludeKeywords: z.array(z.string()).optional(),
  freshnessDays: z.number().int().min(1).max(30).optional(),
  isActive: z.boolean().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const user = await requireEditor();
  if (!user) return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });

  const { id: brandId } = await params;
  const tenantId = await requireTenantId();

  const brand = await prisma.brand.findFirst({ where: { id: brandId, tenantId } });
  if (!brand) return NextResponse.json({ error: "Marka bulunamadı" }, { status: 404 });

  const sources = await prisma.contentSource.findMany({
    where: { brandId },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { items: true } } },
  });

  return NextResponse.json({ data: sources });
}

export async function POST(request: NextRequest, { params }: Params) {
  const user = await requireEditor();
  if (!user) return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });

  const { id: brandId } = await params;
  const tenantId = await requireTenantId();

  const brand = await prisma.brand.findFirst({ where: { id: brandId, tenantId } });
  if (!brand) return NextResponse.json({ error: "Marka bulunamadı" }, { status: 404 });

  const body = await request.json().catch(() => null);

  // Manuel tetikleme: body = { action: "run" }
  if (body?.action === "run") {
    const sources = await prisma.contentSource.findMany({
      where: { brandId, isActive: true },
      select: { id: true },
    });
    const results = [];
    for (const s of sources) {
      try {
        results.push(await ingestContentSource(s.id));
      } catch (err) {
        results.push({ sourceId: s.id, error: String(err) });
      }
    }
    return NextResponse.json({ success: true, results });
  }

  // Yeni kaynak oluştur
  const parsed = sourceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz veri", details: parsed.error.issues }, { status: 400 });
  }

  // Aynı URL zaten var mı?
  const existing = await prisma.contentSource.findUnique({
    where: { brandId_url: { brandId, url: parsed.data.url } },
  });
  if (existing) {
    return NextResponse.json({ error: "Bu URL zaten bu markaya eklenmiş" }, { status: 409 });
  }

  const source = await prisma.contentSource.create({
    data: {
      tenantId,
      brandId,
      name: parsed.data.name,
      url: parsed.data.url,
      keywords: parsed.data.keywords ?? [],
      excludeKeywords: parsed.data.excludeKeywords ?? [],
      freshnessDays: parsed.data.freshnessDays ?? 2,
      isActive: parsed.data.isActive ?? true,
    },
  });

  return NextResponse.json({ data: source }, { status: 201 });
}
