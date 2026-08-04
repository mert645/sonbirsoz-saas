import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireEditor, setArticleStatus } from "@/lib/data/article-mutations";

/**
 * İnsan moderatör kararı: kuyruktaki (REVIEW) içeriği onayla veya reddet.
 * Body: { action: "approve" | "reject", note?: string }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireEditor();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    note?: string;
  };

  if (body.action !== "approve" && body.action !== "reject") {
    return NextResponse.json(
      { error: "action 'approve' veya 'reject' olmalı" },
      { status: 400 }
    );
  }

  const log = await prisma.moderationLog.findUnique({
    where: { id },
    include: { article: { select: { id: true, status: true } }, comment: true },
  });
  if (!log) return NextResponse.json({ error: "Kayıt bulunamadı" }, { status: 404 });

  const approve = body.action === "approve";

  // Log'a insan kararını işle
  const updated = await prisma.moderationLog.update({
    where: { id },
    data: {
      decision: approve ? "APPROVED" : "REJECTED",
      reviewedBy: auth.id || null,
      reviewNote: body.note || null,
      reviewedAt: new Date(),
    },
  });

  // Bağlı içeriğin durumunu güncelle
  if (log.articleId) {
    if (approve) {
      await setArticleStatus(log.articleId, "PUBLISHED", {
        userId: auth.id,
        note: body.note || "Moderasyon kuyruğundan insan onayı",
      });
    } else {
      await setArticleStatus(log.articleId, "REJECTED", {
        userId: auth.id,
        note: body.note || "Moderasyon kuyruğundan insan reddi",
      });
    }
  } else if (log.commentId) {
    await prisma.comment.update({
      where: { id: log.commentId },
      data: { status: approve ? "APPROVED" : "REJECTED" },
    });
  }

  return NextResponse.json({ success: true, log: updated });
}
