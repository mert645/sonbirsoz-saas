import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        primaryColor: true,
        logo: true,
        favicon: true,
        settings: {
          select: {
            siteName: true,
            tagline: true,
          },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant bulunamadı" }, { status: 404 });
    }

    return NextResponse.json({
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
      },
      theme: {
        primaryColor: tenant.primaryColor,
        logo: tenant.logo,
        favicon: tenant.favicon,
      },
      branding: {
        siteName: tenant.settings?.siteName || tenant.name,
        tagline: tenant.settings?.tagline || "",
      },
    });
  } catch (error) {
    console.error("Error fetching tenant theme:", error);
    return NextResponse.json(
      { error: "Tema bilgisi alınamadı" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { primaryColor, logo, favicon, siteName, tagline } = body;

    // Tenant'ı güncelle
    const tenantUpdate: Record<string, unknown> = {};
    if (primaryColor !== undefined) tenantUpdate.primaryColor = primaryColor;
    if (logo !== undefined) tenantUpdate.logo = logo || null;
    if (favicon !== undefined) tenantUpdate.favicon = favicon || null;

    if (Object.keys(tenantUpdate).length > 0) {
      await prisma.tenant.update({
        where: { id },
        data: tenantUpdate,
      });
    }

    // Settings'i güncelle
    const settingsUpdate: Record<string, unknown> = {};
    if (siteName !== undefined) settingsUpdate.siteName = siteName;
    if (tagline !== undefined) settingsUpdate.tagline = tagline;

    if (Object.keys(settingsUpdate).length > 0) {
      await prisma.tenantSettings.update({
        where: { tenantId: id },
        data: settingsUpdate,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating tenant theme:", error);
    return NextResponse.json(
      { error: "Tema güncellenirken hata oluştu" },
      { status: 500 }
    );
  }
}
