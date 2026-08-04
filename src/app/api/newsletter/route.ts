import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail, isEmailConfigured } from "@/lib/email/ses-client";
import { welcomeEmail } from "@/lib/email/templates";
import { SITE_URL } from "@/lib/utils/constants";

export async function POST(request: NextRequest) {
  const { email, name, categories } = await request.json();

  if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "Geçerli bir e-posta adresi giriniz." },
      { status: 400 }
    );
  }

  const normalized = email.trim().toLowerCase();

  try {
    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { email: normalized },
      select: { id: true, isActive: true },
    });

    const subscriber = await prisma.newsletterSubscriber.upsert({
      where: { email: normalized },
      update: {
        isActive: true,
        ...(name ? { name } : {}),
        ...(Array.isArray(categories) ? { categories } : {}),
      },
      create: {
        email: normalized,
        name: name || null,
        categories: Array.isArray(categories) ? categories : [],
      },
    });

    // Hoş geldin maili — yalnızca yeni/yeniden aktifleşen abonelere (best-effort)
    const isNewOrReactivated = !existing || !existing.isActive;
    if (isNewOrReactivated && isEmailConfigured()) {
      const unsubscribeUrl = `${SITE_URL}/api/newsletter/unsubscribe?token=${subscriber.unsubscribeToken}`;
      const mail = welcomeEmail(subscriber.name, unsubscribeUrl);
      sendEmail({ to: normalized, ...mail }).catch(() => {});
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
