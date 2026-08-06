import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentTenantId } from "@/lib/tenant";

export async function POST(request: NextRequest) {
  const tenantId = await getCurrentTenantId();
  
  if (!tenantId) {
    return NextResponse.json(
      { error: "Tenant bulunamadı" },
      { status: 400 }
    );
  }

  const { email, name, categories } = await request.json();

  if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "Geçerli bir e-posta adresi giriniz." },
      { status: 400 }
    );
  }

  const normalized = email.trim().toLowerCase();

  try {
    const existing = await prisma.newsletterSubscriber.findFirst({
      where: { tenantId, email: normalized },
      select: { id: true, isActive: true },
    });

    if (existing) {
      await prisma.newsletterSubscriber.update({
        where: { id: existing.id },
        data: {
          isActive: true,
          ...(name ? { name } : {}),
          ...(Array.isArray(categories) ? { categories } : {}),
        },
      });
    } else {
      await prisma.newsletterSubscriber.create({
        data: {
          tenantId,
          email: normalized,
          name: name || null,
          categories: Array.isArray(categories) ? categories : [],
        },
      });
    }
  } catch (error) {
    console.error("Newsletter subscription failed:", error);
    return NextResponse.json(
      { error: "Abonelik kaydedilemedi. Lütfen tekrar deneyin." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "Bültenimize başarıyla abone oldunuz!",
  });
}
