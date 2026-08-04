import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  requireEditor,
  updateArticle,
  setArticleStatus,
  deleteArticle,
} from "@/lib/data/article-mutations";

/** Kategori ve ana sayfayı temizler — haber yayınlanır/değişir/silinirse çağrılır. */
async function revalidateArticlePaths(id: string) {
  try {
    const article = await prisma.article.findUnique({
      where: { id },
      select: { slug: true, category: { select: { slug: true } } },
    });
    if (article) {
      revalidatePath(`/${article.category.slug}/${article.slug}`);
      revalidatePath(`/${article.category.slug}`);
    }
    revalidatePath("/");
  } catch {
    // best-effort; asla yanıtı engelleme
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireEditor();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const article = await prisma.article.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        slug: true,
        spot: true,
        content: true,
        coverImage: true,
        status: true,
        isFeatured: true,
        isBreaking: true,
        seoTitle: true,
        seoDescription: true,
        rejectionNote: true,
        isAIGenerated: true,
        category: { select: { slug: true, name: true } },
      },
    });
    if (!article) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ data: article });
  } catch (error) {
    console.error("Article fetch failed:", error);
    return NextResponse.json({ error: "Haber getirilemedi." }, { status: 500 });
  }
}

const updateSchema = z.object({
  title: z.string().min(3).optional(),
  content: z.string().min(1).optional(),
  spot: z.string().optional(),
  categoryId: z.string().optional(),
  coverImage: z.string().optional(),
  isFeatured: z.boolean().optional(),
  isBreaking: z.boolean().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  status: z
    .enum(["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED", "REJECTED"])
    .optional(),
  rejectionNote: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireEditor();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  const { status, rejectionNote, ...fields } = parsed.data;

  try {
    if (Object.keys(fields).length > 0) {
      await updateArticle(id, fields);
    }
    if (status) {
      await setArticleStatus(id, status, {
        userId: user.id,
        note: rejectionNote,
      });
    }
    await revalidateArticlePaths(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Article update failed:", error);
    return NextResponse.json(
      { error: "Haber güncellenemedi." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireEditor();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    await deleteArticle(id);
    await revalidateArticlePaths(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Article delete failed:", error);
    return NextResponse.json({ error: "Haber silinemedi." }, { status: 500 });
  }
}
