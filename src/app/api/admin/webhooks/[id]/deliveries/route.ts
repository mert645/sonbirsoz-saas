import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCurrentTenantId } from "@/lib/tenant/get-tenant";
import { prisma } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const tenantId = await getCurrentTenantId();
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant bulunamadı" }, { status: 404 });
    }

    // Webhook'un tenant'a ait olduğunu kontrol et
    const webhook = await prisma.webhook.findFirst({
      where: { id, tenantId },
    });

    if (!webhook) {
      return NextResponse.json({ error: "Webhook bulunamadı" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const [deliveries, total] = await Promise.all([
      prisma.webhookDelivery.findMany({
        where: { webhookId: id },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.webhookDelivery.count({ where: { webhookId: id } }),
    ]);

    return NextResponse.json({
      deliveries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching webhook deliveries:", error);
    return NextResponse.json(
      { error: "Delivery geçmişi yüklenirken hata oluştu" },
      { status: 500 }
    );
  }
}
