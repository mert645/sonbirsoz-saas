import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const acceptSchema = z.object({
  token: z.string().min(1),
  name: z.string().min(2).optional(),
  password: z.string().min(6).optional(),
});

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token gerekli" }, { status: 400 });
  }

  try {
    const invitation = await prisma.tenantInvitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Davet bulunamadı" }, { status: 404 });
    }

    // Tenant bilgilerini ayrı sorgula
    const tenant = await prisma.tenant.findUnique({
      where: { id: invitation.tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
      },
    });

    if (invitation.status !== "PENDING") {
      return NextResponse.json(
        { error: "Bu davet artık geçerli değil" },
        { status: 410 }
      );
    }

    if (new Date() > invitation.expiresAt) {
      await prisma.tenantInvitation.update({
        where: { id: invitation.id },
        data: { status: "EXPIRED" },
      });
      return NextResponse.json(
        { error: "Bu davetin süresi dolmuş" },
        { status: 410 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: invitation.email },
    });

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        tenant,
      },
      userExists: !!existingUser,
    });
  } catch (error) {
    console.error("Invitation check error:", error);
    return NextResponse.json({ error: "Davet kontrol edilemedi" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = acceptSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Geçersiz veri", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { token, name, password } = parsed.data;

  try {
    const invitation = await prisma.tenantInvitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Davet bulunamadı" }, { status: 404 });
    }

    if (invitation.status !== "PENDING") {
      return NextResponse.json(
        { error: "Bu davet artık geçerli değil" },
        { status: 410 }
      );
    }

    if (new Date() > invitation.expiresAt) {
      await prisma.tenantInvitation.update({
        where: { id: invitation.id },
        data: { status: "EXPIRED" },
      });
      return NextResponse.json(
        { error: "Bu davetin süresi dolmuş" },
        { status: 410 }
      );
    }

    let user = await prisma.user.findUnique({
      where: { email: invitation.email },
    });

    if (!user) {
      if (!password) {
        return NextResponse.json(
          { error: "Yeni kullanıcı için şifre gerekli" },
          { status: 400 }
        );
      }

      const bcrypt = await import("bcryptjs");
      const hashedPassword = await bcrypt.hash(password, 12);

      user = await prisma.user.create({
        data: {
          email: invitation.email,
          name: name || invitation.email.split("@")[0],
          passwordHash: hashedPassword,
          role: "AUTHOR",
        },
      });
    }

    const existingMembership = await prisma.tenantUser.findUnique({
      where: {
        tenantId_userId: {
          tenantId: invitation.tenantId,
          userId: user.id,
        },
      },
    });

    if (!existingMembership) {
      await prisma.tenantUser.create({
        data: {
          tenantId: invitation.tenantId,
          userId: user.id,
          role: invitation.role,
        },
      });
    }

    await prisma.tenantInvitation.update({
      where: { id: invitation.id },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
      },
    });

    const tenant = await prisma.tenant.findUnique({
      where: { id: invitation.tenantId },
      select: { slug: true },
    });

    return NextResponse.json({
      success: true,
      message: "Davet kabul edildi",
      redirectUrl: `/admin/dashboard`,
      tenantSlug: tenant?.slug,
    });
  } catch (error) {
    console.error("Accept invitation error:", error);
    return NextResponse.json({ error: "Davet kabul edilemedi" }, { status: 500 });
  }
}
