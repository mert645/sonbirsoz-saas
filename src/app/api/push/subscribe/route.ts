import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentTenantId } from "@/lib/tenant";

export async function POST(req: NextRequest) {
  try {
    const tenantId = await getCurrentTenantId();
    
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant bulunamadı" }, { status: 400 });
    }

    const body = await req.json();
    const { endpoint, keys, categories } = body as {
      endpoint: string;
      keys: { auth: string; p256dh: string };
      categories?: string[];
    };

    if (!endpoint || !keys?.auth || !keys?.p256dh) {
      return NextResponse.json({ error: "Geçersiz abonelik" }, { status: 400 });
    }

    // Önce mevcut kaydı kontrol et
    const existing = await prisma.pushSubscription.findFirst({
      where: { tenantId, endpoint },
    });

    if (existing) {
      await prisma.pushSubscription.update({
        where: { id: existing.id },
        data: { keys, categories: categories ?? [] },
      });
    } else {
      await prisma.pushSubscription.create({
        data: { tenantId, endpoint, keys, categories: categories ?? [] },
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const tenantId = await getCurrentTenantId();
    
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant bulunamadı" }, { status: 400 });
    }

    const body = await req.json();
    const { endpoint } = body as { endpoint: string };
    if (!endpoint) return NextResponse.json({ error: "Endpoint gerekli" }, { status: 400 });
    await prisma.pushSubscription.deleteMany({ where: { tenantId, endpoint } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
