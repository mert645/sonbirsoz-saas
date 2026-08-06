import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { 
  exportUserData, 
  exportTenantData, 
  anonymizeUser, 
  deleteUserCompletely,
  deleteTenantCompletely,
  cleanupExpiredData 
} from "@/lib/gdpr";
import { createAuditLog } from "@/lib/security/audit";

export const dynamic = "force-dynamic";

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role: string }).role !== "SUPER_ADMIN") {
    return null;
  }
  return session.user;
}

/**
 * GET /api/superadmin/gdpr
 * GDPR işlemleri için veri çekme
 */
export async function GET(request: NextRequest) {
  const user = await requireSuperAdmin();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const action = searchParams.get("action");
  const userId = searchParams.get("userId");
  const tenantId = searchParams.get("tenantId");

  try {
    if (action === "export-user" && userId) {
      const data = await exportUserData(userId);
      
      await createAuditLog({
        action: "USER_UPDATE",
        severity: "INFO",
        userId: (user as { id: string }).id,
        details: { action: "admin_data_export", targetUserId: userId },
        success: true,
      });

      return NextResponse.json({ success: true, data });
    }

    if (action === "export-tenant" && tenantId) {
      const data = await exportTenantData(tenantId);
      
      await createAuditLog({
        action: "TENANT_UPDATE",
        severity: "INFO",
        userId: (user as { id: string }).id,
        tenantId,
        details: { action: "tenant_data_export" },
        success: true,
      });

      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json(
      { error: "Geçersiz action parametresi" },
      { status: 400 }
    );
  } catch (error) {
    console.error("GDPR GET error:", error);
    const message = error instanceof Error ? error.message : "İşlem başarısız";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/superadmin/gdpr
 * GDPR işlemleri (silme, anonimleştirme, temizlik)
 */
export async function POST(request: NextRequest) {
  const user = await requireSuperAdmin();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || !body.action) {
    return NextResponse.json({ error: "Action gerekli" }, { status: 400 });
  }

  const { action, userId, tenantId, confirm } = body;

  // Tehlikeli işlemler için onay gerekli
  if (["delete-user", "delete-tenant", "anonymize-user"].includes(action)) {
    if (confirm !== "ONAYLA") {
      return NextResponse.json(
        { error: "Bu işlem için 'ONAYLA' yazarak onay vermeniz gerekiyor" },
        { status: 400 }
      );
    }
  }

  try {
    switch (action) {
      case "anonymize-user": {
        if (!userId) {
          return NextResponse.json({ error: "userId gerekli" }, { status: 400 });
        }
        
        await anonymizeUser(userId);
        
        await createAuditLog({
          action: "USER_DELETE",
          severity: "WARNING",
          userId: (user as { id: string }).id,
          details: { action: "user_anonymized", targetUserId: userId },
          success: true,
        });

        return NextResponse.json({
          success: true,
          message: "Kullanıcı verileri anonimleştirildi",
        });
      }

      case "delete-user": {
        if (!userId) {
          return NextResponse.json({ error: "userId gerekli" }, { status: 400 });
        }
        
        await deleteUserCompletely(userId);
        
        await createAuditLog({
          action: "USER_DELETE",
          severity: "CRITICAL",
          userId: (user as { id: string }).id,
          details: { action: "user_deleted_completely", targetUserId: userId },
          success: true,
        });

        return NextResponse.json({
          success: true,
          message: "Kullanıcı ve tüm verileri kalıcı olarak silindi",
        });
      }

      case "delete-tenant": {
        if (!tenantId) {
          return NextResponse.json({ error: "tenantId gerekli" }, { status: 400 });
        }
        
        await deleteTenantCompletely(tenantId);
        
        await createAuditLog({
          action: "TENANT_DELETE",
          severity: "CRITICAL",
          userId: (user as { id: string }).id,
          tenantId,
          details: { action: "tenant_deleted_completely" },
          success: true,
        });

        return NextResponse.json({
          success: true,
          message: "Tenant ve tüm verileri kalıcı olarak silindi",
        });
      }

      case "cleanup-expired": {
        const result = await cleanupExpiredData();
        
        await createAuditLog({
          action: "SETTINGS_UPDATE",
          severity: "INFO",
          userId: (user as { id: string }).id,
          details: { action: "expired_data_cleanup", ...result },
          success: true,
        });

        return NextResponse.json({
          success: true,
          message: "Süresi dolmuş veriler temizlendi",
          data: result,
        });
      }

      default:
        return NextResponse.json(
          { error: "Geçersiz action" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("GDPR POST error:", error);
    const message = error instanceof Error ? error.message : "İşlem başarısız";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
