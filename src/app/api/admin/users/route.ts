import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireTenantId } from "@/lib/tenant";
import { z } from "zod";
import crypto from "crypto";

const inviteSchema = z.object({
  email: z.string().email("Geçerli bir e-posta adresi girin"),
  role: z.enum(["ADMIN", "EDITOR", "AUTHOR"]).default("EDITOR"),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await requireTenantId();

  try {
    const tenantUsers = await prisma.tenantUser.findMany({
      where: { tenantId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            createdAt: true,
          },
        },
      },
      orderBy: { user: { createdAt: "desc" } },
    });

    const invitations = await prisma.tenantInvitation.findMany({
      where: { tenantId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      users: tenantUsers,
      invitations,
    });
  } catch (error) {
    console.error("Users list error:", error);
    return NextResponse.json({ error: "Kullanıcılar alınamadı" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await requireTenantId();

  const currentUserRole = await prisma.tenantUser.findUnique({
    where: {
      tenantId_userId: {
        tenantId,
        userId: session.user.id!,
      },
    },
  });

  if (!currentUserRole || !["OWNER", "ADMIN"].includes(currentUserRole.role)) {
    return NextResponse.json(
      { error: "Kullanıcı davet etme yetkiniz yok" },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = inviteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Geçersiz veri", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { email, role } = parsed.data;

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      const existingMembership = await prisma.tenantUser.findUnique({
        where: {
          tenantId_userId: {
            tenantId,
            userId: existingUser.id,
          },
        },
      });

      if (existingMembership) {
        return NextResponse.json(
          { error: "Bu kullanıcı zaten bu tenant'a üye" },
          { status: 409 }
        );
      }

      await prisma.tenantUser.create({
        data: {
          tenantId,
          userId: existingUser.id,
          role,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Kullanıcı tenant'a eklendi",
        added: true,
      });
    }

    const existingInvite = await prisma.tenantInvitation.findFirst({
      where: {
        tenantId,
        email,
        status: "PENDING",
      },
    });

    if (existingInvite) {
      return NextResponse.json(
        { error: "Bu e-posta adresine zaten davet gönderilmiş" },
        { status: 409 }
      );
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invitation = await prisma.tenantInvitation.create({
      data: {
        tenantId,
        email,
        role,
        token,
        expiresAt,
        invitedById: session.user.id!,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Davet oluşturuldu",
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error) {
    console.error("Invite error:", error);
    return NextResponse.json({ error: "Davet gönderilemedi" }, { status: 500 });
  }
}
