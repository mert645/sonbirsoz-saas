/**
 * Authentication & Authorization Utilities
 * Tutarlı session doğrulama ve yetkilendirme
 */

import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getCurrentTenantId } from "@/lib/tenant";

export type UserRole = "SUPER_ADMIN" | "ADMIN" | "EDITOR" | "AUTHOR" | "USER";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
}

export interface AuthContext {
  user: AuthenticatedUser;
  tenantId: string | null;
  isSuperAdmin: boolean;
}

/**
 * Session'dan authenticated user bilgisini alır
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return null;
  }
  
  return {
    id: (session.user as { id?: string }).id || "",
    email: session.user.email,
    name: session.user.name || null,
    role: ((session.user as { role?: string }).role || "USER") as UserRole,
  };
}

/**
 * Tam auth context'i döner (user + tenant)
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  const user = await getAuthenticatedUser();
  
  if (!user) {
    return null;
  }
  
  const tenantId = await getCurrentTenantId();
  
  return {
    user,
    tenantId,
    isSuperAdmin: user.role === "SUPER_ADMIN",
  };
}

/**
 * Belirli bir role sahip olup olmadığını kontrol eder
 */
export function hasRole(user: AuthenticatedUser, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(user.role);
}

/**
 * Role hierarchy kontrolü
 * SUPER_ADMIN > ADMIN > EDITOR > AUTHOR > USER
 */
export function hasMinimumRole(user: AuthenticatedUser, minimumRole: UserRole): boolean {
  const roleHierarchy: Record<UserRole, number> = {
    SUPER_ADMIN: 5,
    ADMIN: 4,
    EDITOR: 3,
    AUTHOR: 2,
    USER: 1,
  };
  
  return roleHierarchy[user.role] >= roleHierarchy[minimumRole];
}

/**
 * API route'ları için authentication middleware
 * Kullanım:
 * ```ts
 * export async function GET(request: NextRequest) {
 *   const auth = await requireAuth();
 *   if (auth instanceof NextResponse) return auth;
 *   // auth.user ve auth.tenantId kullanılabilir
 * }
 * ```
 */
export async function requireAuth(): Promise<AuthContext | NextResponse> {
  const context = await getAuthContext();
  
  if (!context) {
    return NextResponse.json(
      { error: "Oturum açmanız gerekiyor" },
      { status: 401 }
    );
  }
  
  return context;
}

/**
 * Belirli roller için authentication
 */
export async function requireRole(
  allowedRoles: UserRole[]
): Promise<AuthContext | NextResponse> {
  const context = await getAuthContext();
  
  if (!context) {
    return NextResponse.json(
      { error: "Oturum açmanız gerekiyor" },
      { status: 401 }
    );
  }
  
  if (!hasRole(context.user, allowedRoles)) {
    return NextResponse.json(
      { error: "Bu işlem için yetkiniz yok" },
      { status: 403 }
    );
  }
  
  return context;
}

/**
 * Admin (ADMIN, EDITOR, AUTHOR) rolü gerektirir
 */
export async function requireAdmin(): Promise<AuthContext | NextResponse> {
  return requireRole(["SUPER_ADMIN", "ADMIN", "EDITOR", "AUTHOR"]);
}

/**
 * Super Admin rolü gerektirir
 */
export async function requireSuperAdmin(): Promise<AuthContext | NextResponse> {
  return requireRole(["SUPER_ADMIN"]);
}

/**
 * Tenant erişim kontrolü
 * Kullanıcının belirtilen tenant'a erişimi olup olmadığını kontrol eder
 */
export async function requireTenantAccess(
  tenantId: string
): Promise<AuthContext | NextResponse> {
  const context = await getAuthContext();
  
  if (!context) {
    return NextResponse.json(
      { error: "Oturum açmanız gerekiyor" },
      { status: 401 }
    );
  }
  
  // Super Admin her tenant'a erişebilir
  if (context.isSuperAdmin) {
    return context;
  }
  
  // Kullanıcının bu tenant'a üyeliği var mı?
  const membership = await prisma.tenantUser.findUnique({
    where: {
      tenantId_userId: {
        tenantId,
        userId: context.user.id,
      },
    },
  });
  
  if (!membership) {
    return NextResponse.json(
      { error: "Bu tenant'a erişim yetkiniz yok" },
      { status: 403 }
    );
  }
  
  return context;
}

/**
 * Resource ownership kontrolü
 * Kullanıcının belirli bir kaynağa erişimi olup olmadığını kontrol eder
 */
export async function requireResourceAccess(
  resourceTenantId: string,
  resourceOwnerId?: string
): Promise<AuthContext | NextResponse> {
  const context = await getAuthContext();
  
  if (!context) {
    return NextResponse.json(
      { error: "Oturum açmanız gerekiyor" },
      { status: 401 }
    );
  }
  
  // Super Admin her şeye erişebilir
  if (context.isSuperAdmin) {
    return context;
  }
  
  // Tenant eşleşmeli
  if (context.tenantId !== resourceTenantId) {
    return NextResponse.json(
      { error: "Bu kaynağa erişim yetkiniz yok" },
      { status: 403 }
    );
  }
  
  // ADMIN ve EDITOR tüm tenant kaynaklarına erişebilir
  if (hasRole(context.user, ["ADMIN", "EDITOR"])) {
    return context;
  }
  
  // AUTHOR sadece kendi kaynaklarına erişebilir
  if (resourceOwnerId && context.user.id !== resourceOwnerId) {
    return NextResponse.json(
      { error: "Bu kaynağa erişim yetkiniz yok" },
      { status: 403 }
    );
  }
  
  return context;
}

/**
 * Session'ın geçerli olup olmadığını kontrol eder
 * (Kullanıcı silinmiş veya deaktive edilmiş olabilir)
 */
export async function validateSession(): Promise<{
  valid: boolean;
  user?: AuthenticatedUser;
  error?: string;
}> {
  const user = await getAuthenticatedUser();
  
  if (!user) {
    return { valid: false, error: "Oturum bulunamadı" };
  }
  
  // Veritabanından kullanıcıyı kontrol et
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, email: true, role: true },
  });
  
  if (!dbUser) {
    return { valid: false, error: "Kullanıcı bulunamadı" };
  }
  
  // Role değişmiş olabilir
  if (dbUser.role !== user.role) {
    return { valid: false, error: "Oturum geçersiz, lütfen tekrar giriş yapın" };
  }
  
  return { valid: true, user };
}
