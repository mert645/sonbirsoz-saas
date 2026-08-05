import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireEditor } from "@/lib/data/article-mutations";
import { requireTenantId } from "@/lib/tenant";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireEditor();
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  
  const tenantId = await requireTenantId();
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  try {
    const existing = await prisma.media.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return NextResponse.json({ error: "Medya bulunamadı" }, { status: 404 });
    }

    if (body.folder !== undefined) {
      await prisma.$executeRaw`UPDATE media SET folder = ${body.folder || "Genel"} WHERE id = ${id} AND "tenantId" = ${tenantId}`;
    }
    if (body.alt !== undefined) {
      await prisma.$executeRaw`UPDATE media SET alt = ${body.alt} WHERE id = ${id} AND "tenantId" = ${tenantId}`;
    }
    if (body.filename !== undefined) {
      await prisma.$executeRaw`UPDATE media SET filename = ${body.filename} WHERE id = ${id} AND "tenantId" = ${tenantId}`;
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PATCH /api/admin/media/[id] error:", err);
    return NextResponse.json({ error: "Güncellenemedi." }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireEditor();
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  
  const tenantId = await requireTenantId();
  const { id } = await params;

  try {
    await prisma.media.delete({ where: { id, tenantId } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/admin/media/[id] error:", err);
    return NextResponse.json({ error: "Silinemedi." }, { status: 500 });
  }
}
