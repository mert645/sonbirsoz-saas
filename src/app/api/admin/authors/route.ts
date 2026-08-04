import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireEditor, makeSlug } from "@/lib/data/article-mutations";

const createSchema = z.object({
  name: z.string().min(1, "Yazar adı zorunludur"),
  slug: z.string().optional(),
  bio: z.string().nullable().optional(),
  avatar: z.string().url("Geçersiz URL").nullable().optional(),
  email: z.string().email("Geçersiz e-posta").nullable().optional(),
  expertise: z.array(z.string()).optional(),
  socialLinks: z.record(z.string(), z.string()).nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(_request: NextRequest) {
  const user = await requireEditor();
  if (!user) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  try {
    const authors = await prisma.author.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { articles: true } },
      },
    });

    const data = authors.map((a) => ({
      id: a.id,
      name: a.name,
      slug: a.slug,
      bio: a.bio,
      avatar: a.avatar,
      email: a.email,
      expertise: a.expertise,
      socialLinks: a.socialLinks,
      isActive: a.isActive,
      articleCount: a._count.articles,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Yazarlar getirilemedi:", error);
    return NextResponse.json({ error: "Yazarlar getirilemedi." }, { status: 500 });
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

  const { name, slug: rawSlug, bio, avatar, email, expertise, socialLinks, isActive } = parsed.data;

  const baseSlug = rawSlug ? makeSlug(rawSlug) : makeSlug(name);
  let slug = baseSlug || `yazar-${Date.now()}`;
  let n = 1;
  while (await prisma.author.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${n++}`;
  }

  if (email) {
    const emailConflict = await prisma.author.findUnique({ where: { email } });
    if (emailConflict) {
      return NextResponse.json(
        { error: "Bu e-posta adresi zaten kullanılıyor." },
        { status: 409 }
      );
    }
  }

  try {
    const author = await prisma.author.create({
      data: {
        name,
        slug,
        bio: bio ?? null,
        avatar: avatar ?? null,
        email: email ?? null,
        expertise: expertise ?? [],
        socialLinks: socialLinks ?? undefined,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json({ data: author }, { status: 201 });
  } catch (error) {
    console.error("Yazar oluşturulamadı:", error);
    return NextResponse.json({ error: "Yazar oluşturulamadı." }, { status: 500 });
  }
}
