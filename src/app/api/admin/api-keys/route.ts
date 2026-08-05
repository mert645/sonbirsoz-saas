import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCurrentTenantId } from "@/lib/tenant/get-tenant";
import { prisma } from "@/lib/db";
import { generateApiKey, API_SCOPES } from "@/lib/api/keys";
import { checkFeatureAccess } from "@/lib/billing/usage";

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

    // API erişimi kontrolü
    const hasAccess = await checkFeatureAccess(tenantId, "apiAccess");
    if (!hasAccess) {
      return NextResponse.json(
        { error: "API erişimi sadece Enterprise plan için geçerlidir" },
        { status: 403 }
      );
    }

    const apiKeys = await prisma.apiKey.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        lastUsedAt: true,
        expiresAt: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      apiKeys,
      availableScopes: API_SCOPES,
    });
  } catch (error) {
    console.error("Error fetching API keys:", error);
    return NextResponse.json(
      { error: "API anahtarları yüklenirken hata oluştu" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tenantId = await getCurrentTenantId();
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant bulunamadı" }, { status: 404 });
    }

    // API erişimi kontrolü
    const hasAccess = await checkFeatureAccess(tenantId, "apiAccess");
    if (!hasAccess) {
      return NextResponse.json(
        { error: "API erişimi sadece Enterprise plan için geçerlidir" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, scopes, expiresAt } = body;

    if (!name || !scopes || !Array.isArray(scopes) || scopes.length === 0) {
      return NextResponse.json(
        { error: "İsim ve en az bir scope gerekli" },
        { status: 400 }
      );
    }

    // Scope doğrulama
    const validScopes = Object.keys(API_SCOPES);
    const invalidScopes = scopes.filter((s: string) => !validScopes.includes(s));
    if (invalidScopes.length > 0) {
      return NextResponse.json(
        { error: `Geçersiz scope'lar: ${invalidScopes.join(", ")}` },
        { status: 400 }
      );
    }

    // API key oluştur
    const { key, keyPrefix } = generateApiKey();

    const apiKey = await prisma.apiKey.create({
      data: {
        tenantId,
        name,
        key,
        keyPrefix,
        scopes,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    // Tam key'i sadece oluşturma anında döndür
    return NextResponse.json({
      apiKey: {
        ...apiKey,
        key, // Sadece bir kez gösterilecek
      },
      message: "API anahtarı oluşturuldu. Bu anahtarı güvenli bir yerde saklayın, tekrar gösterilmeyecektir.",
    });
  } catch (error) {
    console.error("Error creating API key:", error);
    return NextResponse.json(
      { error: "API anahtarı oluşturulurken hata oluştu" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tenantId = await getCurrentTenantId();
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant bulunamadı" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get("id");

    if (!keyId) {
      return NextResponse.json({ error: "API key ID gerekli" }, { status: 400 });
    }

    // Tenant'a ait olduğunu kontrol et
    const apiKey = await prisma.apiKey.findFirst({
      where: { id: keyId, tenantId },
    });

    if (!apiKey) {
      return NextResponse.json({ error: "API key bulunamadı" }, { status: 404 });
    }

    await prisma.apiKey.delete({
      where: { id: keyId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting API key:", error);
    return NextResponse.json(
      { error: "API anahtarı silinirken hata oluştu" },
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
    const { id, name, scopes, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: "API key ID gerekli" }, { status: 400 });
    }

    // Tenant'a ait olduğunu kontrol et
    const apiKey = await prisma.apiKey.findFirst({
      where: { id, tenantId },
    });

    if (!apiKey) {
      return NextResponse.json({ error: "API key bulunamadı" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (scopes !== undefined) updateData.scopes = scopes;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await prisma.apiKey.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        isActive: true,
        expiresAt: true,
        lastUsedAt: true,
      },
    });

    return NextResponse.json({ apiKey: updated });
  } catch (error) {
    console.error("Error updating API key:", error);
    return NextResponse.json(
      { error: "API anahtarı güncellenirken hata oluştu" },
      { status: 500 }
    );
  }
}
