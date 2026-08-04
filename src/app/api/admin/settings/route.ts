import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireEditor } from "@/lib/data/article-mutations";

const putSchema = z.record(z.string(), z.any());

export async function GET(_request: NextRequest) {
  const user = await requireEditor();
  if (!user) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  try {
    const rows = await prisma.siteSettings.findMany();
    const data: Record<string, unknown> = {};
    for (const row of rows) {
      data[row.key] = row.value;
    }
    return NextResponse.json({ data });
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

  const body = await request.json().catch(() => null);
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz veri" }, { status: 400 });
  }

  try {
    const upserts = Object.entries(parsed.data).map(([key, value]) =>
      prisma.siteSettings.upsert({
        where: { key },
        update: { value },
        create: { id: key, key, value },
      })
    );

    await prisma.$transaction(upserts);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Ayarlar kaydedilemedi:", error);
    return NextResponse.json({ error: "Ayarlar kaydedilemedi." }, { status: 500 });
  }
}
