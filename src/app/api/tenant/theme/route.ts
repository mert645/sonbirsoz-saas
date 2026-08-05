import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";

export async function GET() {
  try {
    const headersList = await headers();
    const tenantSlug = headersList.get("x-tenant-slug");

    if (!tenantSlug) {
      return NextResponse.json(
        { error: "Tenant bulunamadı" },
        { status: 404 }
      );
    }

    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      include: {
        settings: true,
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: "Tenant bulunamadı" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      primaryColor: tenant.primaryColor,
      logo: tenant.logo,
      favicon: tenant.favicon,
      siteName: tenant.settings?.siteName || tenant.name,
      tagline: tenant.settings?.tagline || null,
    });
  } catch (error) {
    console.error("Error fetching theme:", error);
    return NextResponse.json(
      { error: "Tema bilgisi alınamadı" },
      { status: 500 }
    );
  }
}
