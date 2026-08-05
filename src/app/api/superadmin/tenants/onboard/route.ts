import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      name,
      slug,
      primaryColor,
      logo,
      categories,
      adminEmail,
      adminName,
      adminPassword,
    } = body;

    // Validasyon
    if (!name || !slug || !adminEmail || !adminPassword) {
      return NextResponse.json(
        { error: "Gerekli alanlar eksik" },
        { status: 400 }
      );
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { error: "Slug sadece küçük harf, rakam ve tire içerebilir" },
        { status: 400 }
      );
    }

    if (adminPassword.length < 8) {
      return NextResponse.json(
        { error: "Şifre en az 8 karakter olmalı" },
        { status: 400 }
      );
    }

    // Slug benzersizlik kontrolü
    const existingTenant = await prisma.tenant.findUnique({
      where: { slug },
    });

    if (existingTenant) {
      return NextResponse.json(
        { error: "Bu slug zaten kullanılıyor" },
        { status: 400 }
      );
    }

    // Email benzersizlik kontrolü
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail.toLowerCase() },
    });

    // Transaction ile tenant, settings, kategoriler ve admin kullanıcı oluştur
    const result = await prisma.$transaction(async (tx) => {
      // 1. Tenant oluştur
      const tenant = await tx.tenant.create({
        data: {
          name,
          slug,
          primaryColor: primaryColor || "#4F46E5",
          logo: logo || null,
          plan: "STARTER",
          isActive: true,
        },
      });

      // 2. Tenant Settings oluştur
      await tx.tenantSettings.create({
        data: {
          tenantId: tenant.id,
          siteName: name,
          tagline: `${name} - Güncel haberler`,
          aiGenerationEnabled: false,
          aiModerationEnabled: false,
          videoStudioEnabled: false,
          newsletterEnabled: true,
          pushEnabled: true,
          customDomainEnabled: false,
          apiAccessEnabled: false,
        },
      });

      // 3. Kategorileri oluştur
      if (categories && categories.length > 0) {
        const categoryColors = [
          "#EF4444", "#F97316", "#F59E0B", "#10B981",
          "#14B8A6", "#3B82F6", "#6366F1", "#8B5CF6", "#EC4899",
        ];

        for (let i = 0; i < categories.length; i++) {
          const categoryName = categories[i];
          const categorySlug = categoryName
            .toLowerCase()
            .replace(/ğ/g, "g")
            .replace(/ü/g, "u")
            .replace(/ş/g, "s")
            .replace(/ı/g, "i")
            .replace(/ö/g, "o")
            .replace(/ç/g, "c")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");

          await tx.category.create({
            data: {
              tenantId: tenant.id,
              name: categoryName,
              slug: categorySlug,
              color: categoryColors[i % categoryColors.length],
              order: i + 1,
            },
          });
        }
      }

      // 4. Admin kullanıcı oluştur veya mevcut kullanıcıyı bağla
      let user;
      if (existingUser) {
        user = existingUser;
      } else {
        const passwordHash = await bcrypt.hash(adminPassword, 12);
        user = await tx.user.create({
          data: {
            email: adminEmail.toLowerCase(),
            name: adminName || null,
            passwordHash,
            role: "ADMIN",
          },
        });
      }

      // 5. Kullanıcıyı tenant'a OWNER olarak bağla
      await tx.tenantUser.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          role: "OWNER",
        },
      });

      return { tenant, user };
    });

    return NextResponse.json({
      success: true,
      tenant: {
        id: result.tenant.id,
        name: result.tenant.name,
        slug: result.tenant.slug,
      },
      user: {
        id: result.user.id,
        email: result.user.email,
      },
    });
  } catch (error) {
    console.error("Error creating tenant:", error);
    return NextResponse.json(
      { error: "Tenant oluşturulurken hata oluştu" },
      { status: 500 }
    );
  }
}
