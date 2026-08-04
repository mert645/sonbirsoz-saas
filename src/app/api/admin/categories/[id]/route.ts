import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireEditor, makeSlug } from "@/lib/data/article-mutations";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  description: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  parentId: z.string().nullable().optional(),
  order: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireEditor();
  if (!user) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Geçersiz veri", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Kategori bulunamadı." }, { status: 404 });
  }

  const { slug: rawSlug, name, ...rest } = parsed.data;

  const data: Record<string, unknown> = { ...rest };
  if (name !== undefined) data.name = name;

  if (rawSlug !== undefined) {
    const baseSlug = makeSlug(rawSlug);
    let slug = baseSlug || `kategori-${Date.now()}`;
    let n = 1;
    while (true) {
      const conflict = await prisma.category.findUnique({ where: { slug } });
      if (!conflict || conflict.id === id) break;
      slug = `${baseSlug}-${n++}`;
    }
    data.slug = slug;
  } else if (name !== undefined && name !== existing.name) {
    const baseSlug = makeSlug(name);
    let slug = baseSlug || `kategori-${Date.now()}`;
    let n = 1;
    while (true) {
      const conflict = await prisma.category.findUnique({ where: { slug } });
      if (!conflict || conflict.id === id) break;
      slug = `${baseSlug}-${n++}`;
    }
    data.slug = slug;
  }

  try {
    const category = await prisma.category.update({ where: { id }, data });
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

  const { id } = await params;

  const existing = await prisma.category.findUnique({
    where: { id },
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
    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Kategori silinemedi:", error);
    return NextResponse.json({ error: "Kategori silinemedi." }, { status: 500 });
  }
}
