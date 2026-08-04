import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireEditor, makeSlug } from "@/lib/data/article-mutations";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().optional(),
  bio: z.string().nullable().optional(),
  avatar: z.string().url().nullable().optional(),
  email: z.string().email().nullable().optional(),
  expertise: z.array(z.string()).optional(),
  socialLinks: z.record(z.string(), z.string()).nullable().optional(),
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

  const existing = await prisma.author.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Yazar bulunamadı." }, { status: 404 });
  }

  const { slug: rawSlug, name, email, ...rest } = parsed.data;
  const data: Record<string, unknown> = { ...rest };

  if (name !== undefined) data.name = name;

  if (email !== undefined) {
    if (email !== null && email !== existing.email) {
      const conflict = await prisma.author.findUnique({ where: { email } });
      if (conflict && conflict.id !== id) {
        return NextResponse.json(
          { error: "Bu e-posta adresi zaten kullanılıyor." },
          { status: 409 }
        );
      }
    }
    data.email = email;
  }

  if (rawSlug !== undefined) {
    const baseSlug = makeSlug(rawSlug);
    let slug = baseSlug || `yazar-${Date.now()}`;
    let n = 1;
    while (true) {
      const conflict = await prisma.author.findUnique({ where: { slug } });
      if (!conflict || conflict.id === id) break;
      slug = `${baseSlug}-${n++}`;
    }
    data.slug = slug;
  } else if (name !== undefined && name !== existing.name) {
    const baseSlug = makeSlug(name);
    let slug = baseSlug || `yazar-${Date.now()}`;
    let n = 1;
    while (true) {
      const conflict = await prisma.author.findUnique({ where: { slug } });
      if (!conflict || conflict.id === id) break;
      slug = `${baseSlug}-${n++}`;
    }
    data.slug = slug;
  }

  try {
    const author = await prisma.author.update({ where: { id }, data });
    return NextResponse.json({ data: author });
  } catch (error) {
    console.error("Yazar güncellenemedi:", error);
    return NextResponse.json({ error: "Yazar güncellenemedi." }, { status: 500 });
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

  const existing = await prisma.author.findUnique({
    where: { id },
    include: { _count: { select: { articles: true } } },
  });

  if (!existing) {
    return NextResponse.json({ error: "Yazar bulunamadı." }, { status: 404 });
  }

  if (existing._count.articles > 0) {
    return NextResponse.json(
      {
        error: "Bu yazara bağlı haberler var.",
        articleCount: existing._count.articles,
        blocked: true,
      },
      { status: 409 }
    );
  }

  try {
    await prisma.author.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Yazar silinemedi:", error);
    return NextResponse.json({ error: "Yazar silinemedi." }, { status: 500 });
  }
}
