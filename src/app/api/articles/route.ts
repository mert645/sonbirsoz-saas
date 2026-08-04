import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getLatestArticles, getArticlesByCategory } from "@/lib/data/articles";
import { requireEditor, createArticle } from "@/lib/data/article-mutations";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(50, parseInt(searchParams.get("limit") || "20"));
  const category = searchParams.get("category");

  if (category) {
    const { articles, total } = await getArticlesByCategory(category, {
      page,
      limit,
    });
    return NextResponse.json({
      data: articles,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  }

  const articles = await getLatestArticles(limit);
  return NextResponse.json({
    data: articles,
    meta: { total: articles.length, page, limit, totalPages: 1 },
  });
}

const createSchema = z.object({
  title: z.string().min(3, "Başlık en az 3 karakter olmalı"),
  content: z.string().min(1, "İçerik boş olamaz"),
  spot: z.string().optional(),
  categoryId: z.string().optional(),
  categorySlug: z.string().optional(),
  coverImage: z.string().url().optional().or(z.literal("")),
  status: z.enum(["DRAFT", "REVIEW", "PUBLISHED"]).optional(),
  isFeatured: z.boolean().optional(),
  isBreaking: z.boolean().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const user = await requireEditor();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Geçersiz veri", details: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const article = await createArticle(user, {
      ...parsed.data,
      coverImage: parsed.data.coverImage || undefined,
    });
    return NextResponse.json(article, { status: 201 });
  } catch (error) {
    console.error("Article create failed:", error);
    return NextResponse.json(
      { error: "Haber kaydedilemedi." },
      { status: 500 }
    );
  }
}
