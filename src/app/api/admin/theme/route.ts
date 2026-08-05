import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCurrentTenantId } from "@/lib/tenant/get-tenant";
import { prisma } from "@/lib/db";

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

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        settings: true,
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant bulunamadı" }, { status: 404 });
    }

    return NextResponse.json({
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
    console.error("Error fetching theme settings:", error);
    return NextResponse.json(
      { error: "Tema ayarları yüklenirken hata oluştu" },
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
    const { primaryColor, logo, favicon, siteName, tagline } = body;

    // Tenant'ı güncelle
    const tenantUpdate: Record<string, unknown> = {};
    if (primaryColor !== undefined) tenantUpdate.primaryColor = primaryColor;
    if (logo !== undefined) tenantUpdate.logo = logo || null;
    if (favicon !== undefined) tenantUpdate.favicon = favicon || null;

    if (Object.keys(tenantUpdate).length > 0) {
      await prisma.tenant.update({
        where: { id: tenantId },
        data: tenantUpdate,
      });
    }

    // Settings'i güncelle
    const settingsUpdate: Record<string, unknown> = {};
    if (siteName !== undefined) settingsUpdate.siteName = siteName;
    if (tagline !== undefined) settingsUpdate.tagline = tagline;

    if (Object.keys(settingsUpdate).length > 0) {
      await prisma.tenantSettings.update({
        where: { tenantId },
        data: settingsUpdate,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating theme settings:", error);
    return NextResponse.json(
      { error: "Tema ayarları güncellenirken hata oluştu" },
      { status: 500 }
    );
  }
}
