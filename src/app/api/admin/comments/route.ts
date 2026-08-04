import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireEditor } from "@/lib/data/article-mutations";

export async function GET(req: NextRequest) {
  const auth = await requireEditor();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = 20;

  const where = status ? { status: status as "PENDING" | "APPROVED" | "REJECTED" } : {};

  const [total, comments] = await Promise.all([
    prisma.comment.count({ where }),
    prisma.comment.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        article: { select: { id: true, title: true, slug: true, category: { select: { slug: true } } } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return NextResponse.json({ data: comments, total, page, limit });
}

// Test amaçlı: admin panelinden yorum oluştur
export async function POST(req: NextRequest) {
  const auth = await requireEditor();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { articleId, content } = body as { articleId: string; content: string };
  if (!articleId || !content) {
    return NextResponse.json({ error: "articleId ve content zorunlu" }, { status: 400 });
  }

  const comment = await prisma.comment.create({
    data: {
      articleId,
      userId: auth.id!,
      content,
      status: "PENDING",
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      article: { select: { id: true, title: true, slug: true, category: { select: { slug: true } } } },
    },
  });

  return NextResponse.json(comment, { status: 201 });
}
