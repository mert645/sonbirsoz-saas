import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireEditor } from "@/lib/data/article-mutations";
import { requireTenantId } from "@/lib/tenant";

const putSchema = z.object({
  siteName: z.string().optional(),
  tagline: z.string().optional(),
  defaultSeoTitle: z.string().optional(),
  defaultSeoDescription: z.string().optional(),
  googleAnalyticsId: z.string().optional(),
  socialLinks: z.record(z.string(), z.string()).optional(),
});

export async function GET(_request: NextRequest) {
  const user = await requireEditor();
  if (!user) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  const tenantId = await requireTenantId();

  try {
    const settings = await prisma.tenantSettings.findUnique({
      where: { tenantId },
    });
    return NextResponse.json({ data: settings || {} });
  } catch (error) {
    console.error("Ayarlar getirilemedi:", error);
    return NextResponse.json({ error: "Ayarlar getirilemedi." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const user = await requireEditor();
  if (!user) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  const tenantId = await requireTenantId();
  const body = await request.json().catch(() => null);
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz veri" }, { status: 400 });
  }

  try {
    await prisma.tenantSettings.upsert({
      where: { tenantId },
      update: parsed.data,
      create: { tenantId, ...parsed.data },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Ayarlar kaydedilemedi:", error);
    return NextResponse.json({ error: "Ayarlar kaydedilemedi." }, { status: 500 });
  }
}
