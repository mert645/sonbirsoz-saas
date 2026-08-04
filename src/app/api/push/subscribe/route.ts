import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { endpoint, keys, categories } = body as {
      endpoint: string;
      keys: { auth: string; p256dh: string };
      categories?: string[];
    };

    if (!endpoint || !keys?.auth || !keys?.p256dh) {
      return NextResponse.json({ error: "Geçersiz abonelik" }, { status: 400 });
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { keys, categories: categories ?? [] },
      create: { endpoint, keys, categories: categories ?? [] },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { endpoint } = body as { endpoint: string };
    if (!endpoint) return NextResponse.json({ error: "Endpoint gerekli" }, { status: 400 });
    await prisma.pushSubscription.deleteMany({ where: { endpoint } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
