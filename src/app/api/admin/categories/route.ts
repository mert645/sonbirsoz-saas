import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireEditor, makeSlug } from "@/lib/data/article-mutations";
import { requireTenantId } from "@/lib/tenant";

const createSchema = z.object({
  name: z.string().min(1, "Kategori adı zorunludur"),
  slug: z.string().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Geçersiz renk kodu").optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  parentId: z.string().nullable().optional(),
  order: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(_request: NextRequest) {
  const user = await requireEditor();
  if (!user) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  try {
    const tenantId = await requireTenantId();
    
    const categories = await prisma.category.findMany({
      where: { tenantId },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      include: {
        _count: { select: { articles: true } },
        parent: { select: { id: true, name: true } },
      },
    });

    const data = categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      color: cat.color,
      icon: cat.icon,
      parentId: cat.parentId,
      parentName: cat.parent?.name ?? null,
      order: cat.order,
      isActive: cat.isActive,
      articleCount: cat._count.articles,
      createdAt: cat.createdAt,
      updatedAt: cat.updatedAt,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Kategoriler getirilemedi:", error);
    return NextResponse.json({ error: "Kategoriler getirilemedi." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await requireEditor();
  if (!user) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Geçersiz veri", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { name, slug: rawSlug, color, description, icon, parentId, order, isActive } = parsed.data;

  try {
    const tenantId = await requireTenantId();
    
    const baseSlug = rawSlug ? makeSlug(rawSlug) : makeSlug(name);
    let slug = baseSlug || `kategori-${Date.now()}`;
    let n = 1;
    while (await prisma.category.findUnique({ where: { tenantId_slug: { tenantId, slug } } })) {
      slug = `${baseSlug}-${n++}`;
    }

    const category = await prisma.category.create({
      data: {
        tenantId,
        name,
        slug,
        color: color ?? "#4F46E5",
        description: description ?? null,
        icon: icon ?? null,
        parentId: parentId ?? null,
        order: order ?? 0,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json({ data: category }, { status: 201 });
  } catch (error) {
    console.error("Kategori oluşturulamadı:", error);
    return NextResponse.json({ error: "Kategori oluşturulamadı." }, { status: 500 });
  }
}
