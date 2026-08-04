import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireEditor } from "@/lib/data/article-mutations";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireEditor();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { status } = body as { status: "APPROVED" | "REJECTED" | "PENDING" };

  if (!["APPROVED", "REJECTED", "PENDING"].includes(status)) {
    return NextResponse.json({ error: "Geçersiz durum" }, { status: 400 });
  }

  const comment = await prisma.comment.update({
    where: { id },
    data: { status },
    include: {
      user: { select: { id: true, name: true, email: true } },
      article: { select: { id: true, title: true, slug: true, category: { select: { slug: true } } } },
    },
  });

  return NextResponse.json(comment);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireEditor();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.comment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
