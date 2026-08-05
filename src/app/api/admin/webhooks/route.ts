import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCurrentTenantId } from "@/lib/tenant/get-tenant";
import { prisma } from "@/lib/db";
import { generateWebhookSecret, WEBHOOK_EVENTS } from "@/lib/api/keys";
import { checkFeatureAccess } from "@/lib/billing/usage";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tenantId = await getCurrentTenantId();
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant bulunamadı" }, { status: 404 });
    }

    // API erişimi kontrolü
    const hasAccess = await checkFeatureAccess(tenantId, "apiAccess");
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Webhook erişimi sadece Enterprise plan için geçerlidir" },
        { status: 403 }
      );
    }

    const webhooks = await prisma.webhook.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        url: true,
        events: true,
        isActive: true,
        failCount: true,
        lastTriedAt: true,
        lastSuccess: true,
        createdAt: true,
        _count: {
          select: { deliveries: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      webhooks,
      availableEvents: WEBHOOK_EVENTS,
    });
  } catch (error) {
    console.error("Error fetching webhooks:", error);
    return NextResponse.json(
      { error: "Webhook'lar yüklenirken hata oluştu" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tenantId = await getCurrentTenantId();
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant bulunamadı" }, { status: 404 });
    }

    // API erişimi kontrolü
    const hasAccess = await checkFeatureAccess(tenantId, "apiAccess");
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Webhook erişimi sadece Enterprise plan için geçerlidir" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, url, events } = body;

    if (!name || !url || !events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: "İsim, URL ve en az bir event gerekli" },
        { status: 400 }
      );
    }

    // URL validasyonu
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: "Geçersiz URL" }, { status: 400 });
    }

    // Event validasyonu
    const validEvents = Object.keys(WEBHOOK_EVENTS);
    const invalidEvents = events.filter((e: string) => !validEvents.includes(e));
    if (invalidEvents.length > 0) {
      return NextResponse.json(
        { error: `Geçersiz event'ler: ${invalidEvents.join(", ")}` },
        { status: 400 }
      );
    }

    const secret = generateWebhookSecret();

    const webhook = await prisma.webhook.create({
      data: {
        tenantId,
        name,
        url,
        events,
        secret,
      },
      select: {
        id: true,
        name: true,
        url: true,
        events: true,
        secret: true, // Sadece oluşturma anında göster
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      webhook,
      message: "Webhook oluşturuldu. Secret'ı güvenli bir yerde saklayın.",
    });
  } catch (error) {
    console.error("Error creating webhook:", error);
    return NextResponse.json(
      { error: "Webhook oluşturulurken hata oluştu" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tenantId = await getCurrentTenantId();
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant bulunamadı" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const webhookId = searchParams.get("id");

    if (!webhookId) {
      return NextResponse.json({ error: "Webhook ID gerekli" }, { status: 400 });
    }

    // Tenant'a ait olduğunu kontrol et
    const webhook = await prisma.webhook.findFirst({
      where: { id: webhookId, tenantId },
    });

    if (!webhook) {
      return NextResponse.json({ error: "Webhook bulunamadı" }, { status: 404 });
    }

    await prisma.webhook.delete({
      where: { id: webhookId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting webhook:", error);
    return NextResponse.json(
      { error: "Webhook silinirken hata oluştu" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tenantId = await getCurrentTenantId();
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant bulunamadı" }, { status: 404 });
    }

    const body = await request.json();
    const { id, name, url, events, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: "Webhook ID gerekli" }, { status: 400 });
    }

    // Tenant'a ait olduğunu kontrol et
    const webhook = await prisma.webhook.findFirst({
      where: { id, tenantId },
    });

    if (!webhook) {
      return NextResponse.json({ error: "Webhook bulunamadı" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (url !== undefined) updateData.url = url;
    if (events !== undefined) updateData.events = events;
    if (isActive !== undefined) {
      updateData.isActive = isActive;
      // Yeniden aktifleştiriliyorsa fail count'u sıfırla
      if (isActive) updateData.failCount = 0;
    }

    const updated = await prisma.webhook.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        url: true,
        events: true,
        isActive: true,
        failCount: true,
        lastTriedAt: true,
        lastSuccess: true,
      },
    });

    return NextResponse.json({ webhook: updated });
  } catch (error) {
    console.error("Error updating webhook:", error);
    return NextResponse.json(
      { error: "Webhook güncellenirken hata oluştu" },
      { status: 500 }
    );
  }
}
