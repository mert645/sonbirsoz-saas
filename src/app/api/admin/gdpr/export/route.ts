import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { exportUserData, anonymizeUser, deleteUserCompletely } from "@/lib/gdpr";
import { createAuditLog } from "@/lib/security/audit";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/gdpr/export
 * Kullanıcının kendi verilerini export etmesi
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: "Oturum açmanız gerekiyor" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;

  try {
    const data = await exportUserData(userId);
    
    // Audit log
    await createAuditLog({
      action: "USER_UPDATE",
      severity: "INFO",
      userId,
      userEmail: session.user.email || undefined,
      details: { action: "data_export" },
      success: true,
    });

    // JSON dosyası olarak indir
    const filename = `veri-export-${new Date().toISOString().split("T")[0]}.json`;
    
    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("GDPR export error:", error);
    return NextResponse.json(
      { error: "Veri export edilemedi" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/gdpr/export
 * Kullanıcının kendi hesabını silmesi (Unutulma Hakkı)
 */
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: "Oturum açmanız gerekiyor" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const userRole = (session.user as { role: string }).role;

  // Super Admin kendini silemez
  if (userRole === "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Super Admin hesabı bu şekilde silinemez" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "anonymize";

  try {
    if (action === "delete") {
      // Tamamen sil
      await deleteUserCompletely(userId);
      
      return NextResponse.json({
        success: true,
        message: "Hesabınız ve tüm verileriniz kalıcı olarak silindi",
      });
    } else {
      // Anonimleştir (varsayılan)
      await anonymizeUser(userId);
      
      return NextResponse.json({
        success: true,
        message: "Hesabınız anonimleştirildi",
      });
    }
  } catch (error) {
    console.error("GDPR delete error:", error);
    const message = error instanceof Error ? error.message : "İşlem başarısız";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
