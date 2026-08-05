import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireEditor } from "@/lib/data/article-mutations";
import { requireTenantId } from "@/lib/tenant";

export async function GET(_req: NextRequest) {
  const user = await requireEditor();
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  try {
    const tenantId = await requireTenantId();
    
    const media = await prisma.media.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    const data = media.map((m) => ({
      id: m.id,
      url: m.url,
      filename: m.filename,
      alt: m.alt,
      width: m.width,
      height: m.height,
      size: m.size,
      format: m.format,
      createdAt: m.createdAt.toISOString(),
      folder: m.folder ?? "Genel",
    }));

    const folderSet = new Set(data.map((d) => d.folder));
    const folders = Array.from(folderSet).sort();

    return NextResponse.json({ data, folders });
  } catch (err) {
    console.error("GET /api/admin/media:", err);
    return NextResponse.json({ error: "Medya listelenemedi." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await requireEditor();
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  try {
    const tenantId = await requireTenantId();
    
    const body = await request.json();
    const { url, filename, alt, caption, width, height, size, format, folder } = body as {
      url: string; filename: string; alt?: string; caption?: string;
      width?: number; height?: number; size?: number; format?: string; folder?: string;
    };

    if (!url || !filename) {
      return NextResponse.json({ error: "url ve filename zorunlu." }, { status: 400 });
    }

    const media = await prisma.media.create({
      data: {
        tenantId,
        url,
        filename,
        alt: alt ?? null,
        caption: caption ?? null,
        width: width ?? null,
        height: height ?? null,
        size: size ?? null,
        format: format ?? null,
        folder: folder?.trim() || "Genel",
      },
    });

    return NextResponse.json({ data: media }, { status: 201 });
  } catch (err) {
    console.error("POST /api/admin/media:", err);
    return NextResponse.json({ error: "Medya kaydedilemedi." }, { status: 500 });
  }
}
