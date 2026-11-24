/**
 * Taslak stüdyosu AI işlemleri
 * POST /api/admin/brand-posts/[id]/studio
 *
 * Body: { action: "apply_voice" | "style_examples" | "revise", revisionNote?: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireEditor } from "@/lib/data/article-mutations";
import { requireTenantId } from "@/lib/tenant";
import {
  applyVoiceGuidelines,
  generateWithStyleExamples,
  applyRevision,
} from "@/lib/social/draft-studio";

const studioSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("apply_voice") }),
  z.object({ action: z.literal("style_examples"), sourceUrl: z.string().url().optional() }),
  z.object({ action: z.literal("revise"), revisionNote: z.string().min(1) }),
]);

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const user = await requireEditor();
  if (!user) return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });

  const { id: postId } = await params;
  const tenantId = await requireTenantId();

  const post = await prisma.brandPost.findFirst({
    where: { id: postId, brand: { tenantId } },
    include: { brand: { select: { id: true, name: true } } },
  });
  if (!post) return NextResponse.json({ error: "Gönderi bulunamadı" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = studioSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz veri", details: parsed.error.issues }, { status: 400 });
  }

  try {
    if (parsed.data.action === "apply_voice") {
      const result = await applyVoiceGuidelines(post.brandId, post.caption);
      if (result.changed) {
        await prisma.brandPost.update({
          where: { id: postId },
          data: { caption: result.caption, updatedAt: new Date() },
        });
      }
      return NextResponse.json({ caption: result.caption, changed: result.changed });
    }

    if (parsed.data.action === "style_examples") {
      // Kaynak başlık ve spot: caption'ın ilk satırından
      const lines = post.caption.split("\n");
      const sourceTitle = lines[0].replace(/#\S+/g, "").trim();
      const sourceSpot = lines.slice(1, 3).join(" ").replace(/#\S+/g, "").trim();

      const result = await generateWithStyleExamples(
        post.brandId,
        sourceTitle || post.caption.slice(0, 100),
        sourceSpot,
        parsed.data.sourceUrl || post.sourceUrl || undefined,
      );
      await prisma.brandPost.update({
        where: { id: postId },
        data: { caption: result.caption, updatedAt: new Date() },
      });
      return NextResponse.json({ caption: result.caption, examplesUsed: result.examplesUsed });
    }

    if (parsed.data.action === "revise") {
      const result = await applyRevision(post.brandId, post.caption, parsed.data.revisionNote);
      await prisma.brandPost.update({
        where: { id: postId },
        data: { caption: result.caption, updatedAt: new Date() },
      });
      return NextResponse.json({ caption: result.caption });
    }
  } catch (err) {
    console.error("studio action failed:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  return NextResponse.json({ error: "Geçersiz aksiyon" }, { status: 400 });
}
