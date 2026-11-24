/**
 * BrandPost listesi — GET /api/admin/brands/[id]/posts
 * Filtreleme: ?status=PENDING_APPROVAL|DRAFT|SCHEDULED|POSTED|FAILED
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireEditor } from "@/lib/data/article-mutations";
import { requireTenantId } from "@/lib/tenant";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const user = await requireEditor();
  if (!user) return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });

  const { id: brandId } = await params;
  const tenantId = await requireTenantId();

  const brand = await prisma.brand.findFirst({ where: { id: brandId, tenantId } });
  if (!brand) return NextResponse.json({ error: "Marka bulunamadı" }, { status: 404 });

  const statusFilter = request.nextUrl.searchParams.get("status");
  const take = Math.min(Number(request.nextUrl.searchParams.get("take") ?? "50"), 100);
  const skip = Number(request.nextUrl.searchParams.get("skip") ?? "0");

  const posts = await prisma.brandPost.findMany({
    where: {
      brandId,
      ...(statusFilter ? { status: statusFilter as never } : {}),
    },
    orderBy: { createdAt: "desc" },
    take,
    skip,
    include: {
      account: { select: { platform: true, username: true } },
    },
  });

  const total = await prisma.brandPost.count({
    where: { brandId, ...(statusFilter ? { status: statusFilter as never } : {}) },
  });

  return NextResponse.json({ data: posts, total, take, skip });
}
