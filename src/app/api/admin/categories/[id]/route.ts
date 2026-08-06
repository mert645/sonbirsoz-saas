import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireEditor, makeSlug } from "@/lib/data/article-mutations";
import { requireTenantId } from "@/lib/tenant";
import { sanitizeInput, containsXss, containsSqlInjection } from "@/lib/security/sanitize";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().max(200).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  description: z.string().max(500).nullable().optional(),
  icon: z.string().max(50).nullable().optional(),
  parentId: z.string().max(50).nullable().optional(),
  order: z.number().int().min(0).max(1000).optional(),
  isActive: z.boolean().optional(),
});

// ID format validation (CUID)
const idSchema = z.string().regex(/^[a-z0-9]{20,30}$/i, "Geçersiz ID formatı");

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireEditor();
  if (!user) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  const tenantId = await requireTenantId();
  const { id } = await params;
  
  // ID validation
  const idValidation = idSchema.safeParse(id);
  if (!idValidation.success) {
    return NextResponse.json({ error: "Geçersiz kategori ID" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 });
  }
  
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Geçersiz veri", details: parsed.error.issues },
      { status: 400 }
    );
  }

  // XSS ve SQL injection kontrolü
  const { name, slug: rawSlug, description } = parsed.data;
  if (name && (containsXss(name) || containsSqlInjection(name))) {
    return NextResponse.json({ error: "Geçersiz karakterler tespit edildi" }, { status: 400 });
  }
  if (description && (containsXss(description) || containsSqlInjection(description))) {
    return NextResponse.json({ error: "Geçersiz karakterler tespit edildi" }, { status: 400 });
  }

  const existing = await prisma.category.findFirst({ where: { id, tenantId } });
  if (!existing) {
    return NextResponse.json({ error: "Kategori bulunamadı." }, { status: 404 });
  }

  const { slug: _, name: sanitizedName, description: desc, ...rest } = parsed.data;

  const data: Record<string, unknown> = { ...rest };
  if (sanitizedName !== undefined) data.name = sanitizeInput(sanitizedName);
  if (desc !== undefined) data.description = desc ? sanitizeInput(desc) : null;

  if (rawSlug !== undefined) {
    const baseSlug = makeSlug(sanitizeInput(rawSlug));
    let slug = baseSlug || `kategori-${Date.now()}`;
    let n = 1;
    while (true) {
      const conflict = await prisma.category.findFirst({ where: { tenantId, slug } });
      if (!conflict || conflict.id === id) break;
      slug = `${baseSlug}-${n++}`;
    }
    data.slug = slug;
  } else if (sanitizedName !== undefined && sanitizedName !== existing.name) {
    const baseSlug = makeSlug(sanitizeInput(sanitizedName));
    let slug = baseSlug || `kategori-${Date.now()}`;
    let n = 1;
    while (true) {
      const conflict = await prisma.category.findFirst({ where: { tenantId, slug } });
      if (!conflict || conflict.id === id) break;
      slug = `${baseSlug}-${n++}`;
    }
    data.slug = slug;
  }

  try {
    const category = await prisma.category.update({ where: { id, tenantId }, data });
    return NextResponse.json({ data: category });
  } catch (error) {
    console.error("Kategori güncellenemedi:", error);
    return NextResponse.json({ error: "Kategori güncellenemedi." }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireEditor();
  if (!user) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  const tenantId = await requireTenantId();
  const { id } = await params;
  
  // ID validation
  const idValidation = idSchema.safeParse(id);
  if (!idValidation.success) {
    return NextResponse.json({ error: "Geçersiz kategori ID" }, { status: 400 });
  }

  const existing = await prisma.category.findFirst({
    where: { id, tenantId },
    include: { _count: { select: { articles: true } } },
  });

  if (!existing) {
    return NextResponse.json({ error: "Kategori bulunamadı." }, { status: 404 });
  }

  if (existing._count.articles > 0) {
    return NextResponse.json(
      {
        error: "Bu kategoriye bağlı haberler var.",
        articleCount: existing._count.articles,
        blocked: true,
      },
      { status: 409 }
    );
  }

  try {
    await prisma.category.delete({ where: { id, tenantId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Kategori silinemedi:", error);
    return NextResponse.json({ error: "Kategori silinemedi." }, { status: 500 });
  }
}
