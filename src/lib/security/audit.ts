/**
 * Audit Logging System
 * Kullanıcı aksiyonlarını ve güvenlik olaylarını loglar
 */

import { prisma } from "@/lib/db";

export type AuditAction =
  | "LOGIN"
  | "LOGOUT"
  | "LOGIN_FAILED"
  | "PASSWORD_CHANGE"
  | "PASSWORD_RESET"
  | "USER_CREATE"
  | "USER_UPDATE"
  | "USER_DELETE"
  | "TENANT_CREATE"
  | "TENANT_UPDATE"
  | "TENANT_DELETE"
  | "ARTICLE_CREATE"
  | "ARTICLE_UPDATE"
  | "ARTICLE_DELETE"
  | "ARTICLE_PUBLISH"
  | "SETTINGS_UPDATE"
  | "API_KEY_CREATE"
  | "API_KEY_DELETE"
  | "WEBHOOK_CREATE"
  | "WEBHOOK_DELETE"
  | "PERMISSION_CHANGE"
  | "SUSPICIOUS_ACTIVITY"
  | "RATE_LIMIT_EXCEEDED"
  | "INVALID_ACCESS_ATTEMPT";

export type AuditSeverity = "INFO" | "WARNING" | "ERROR" | "CRITICAL";

export interface AuditLogEntry {
  action: AuditAction;
  severity: AuditSeverity;
  userId?: string;
  userEmail?: string;
  tenantId?: string;
  resourceType?: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
  success: boolean;
}

/**
 * Audit log kaydı oluşturur
 */
export async function createAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    // Hassas verileri maskele
    const sanitizedDetails = entry.details
      ? maskSensitiveData(entry.details)
      : undefined;
    
    await prisma.auditLog.create({
      data: {
        action: entry.action,
        severity: entry.severity,
        userId: entry.userId || null,
        userEmail: entry.userEmail || null,
        tenantId: entry.tenantId || null,
        resourceType: entry.resourceType || null,
        resourceId: entry.resourceId || null,
        ipAddress: entry.ipAddress || null,
        userAgent: entry.userAgent ? truncate(entry.userAgent, 500) : null,
        details: sanitizedDetails ? JSON.parse(JSON.stringify(sanitizedDetails)) : {},
        success: entry.success,
        createdAt: new Date(),
      },
    });
  } catch (error) {
    // Audit log hatası ana işlemi engellememelidir
    console.error("[AUDIT] Failed to create audit log:", error);
  }
}

/**
 * Hassas verileri maskeler
 */
function maskSensitiveData(data: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = [
    "password",
    "passwordHash",
    "token",
    "secret",
    "apiKey",
    "key",
    "authorization",
    "cookie",
    "session",
    "creditCard",
    "ssn",
    "cvv",
  ];
  
  const masked: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    
    if (sensitiveKeys.some((sk) => lowerKey.includes(sk))) {
      masked[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      masked[key] = maskSensitiveData(value as Record<string, unknown>);
    } else {
      masked[key] = value;
    }
  }
  
  return masked;
}

/**
 * String'i belirli uzunlukta keser
 */
function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
}

/**
 * Login audit helper
 */
export async function auditLogin(
  email: string,
  success: boolean,
  ipAddress?: string,
  userAgent?: string,
  userId?: string,
  failReason?: string
): Promise<void> {
  await createAuditLog({
    action: success ? "LOGIN" : "LOGIN_FAILED",
    severity: success ? "INFO" : "WARNING",
    userId,
    userEmail: email,
    ipAddress,
    userAgent,
    success,
    details: success ? undefined : { reason: failReason },
  });
}

/**
 * Resource change audit helper
 */
export async function auditResourceChange(
  action: "CREATE" | "UPDATE" | "DELETE",
  resourceType: string,
  resourceId: string,
  userId: string,
  tenantId?: string,
  changes?: Record<string, unknown>
): Promise<void> {
  const actionMap: Record<string, AuditAction> = {
    "ARTICLE_CREATE": "ARTICLE_CREATE",
    "ARTICLE_UPDATE": "ARTICLE_UPDATE",
    "ARTICLE_DELETE": "ARTICLE_DELETE",
    "USER_CREATE": "USER_CREATE",
    "USER_UPDATE": "USER_UPDATE",
    "USER_DELETE": "USER_DELETE",
    "TENANT_CREATE": "TENANT_CREATE",
    "TENANT_UPDATE": "TENANT_UPDATE",
    "TENANT_DELETE": "TENANT_DELETE",
  };
  
  const auditAction = actionMap[`${resourceType.toUpperCase()}_${action}`] || "SETTINGS_UPDATE";
  
  await createAuditLog({
    action: auditAction,
    severity: action === "DELETE" ? "WARNING" : "INFO",
    userId,
    tenantId,
    resourceType,
    resourceId,
    success: true,
    details: changes,
  });
}

/**
 * Security event audit helper
 */
export async function auditSecurityEvent(
  action: AuditAction,
  severity: AuditSeverity,
  details: Record<string, unknown>,
  ipAddress?: string,
  userId?: string
): Promise<void> {
  await createAuditLog({
    action,
    severity,
    userId,
    ipAddress,
    success: false,
    details,
  });
}

/**
 * Audit log'ları sorgular (Super Admin için)
 */
export async function queryAuditLogs(options: {
  tenantId?: string;
  userId?: string;
  action?: AuditAction;
  severity?: AuditSeverity;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}): Promise<{
  logs: Array<{
    id: string;
    action: string;
    severity: string;
    userId: string | null;
    userEmail: string | null;
    tenantId: string | null;
    resourceType: string | null;
    resourceId: string | null;
    ipAddress: string | null;
    success: boolean;
    createdAt: Date;
  }>;
  total: number;
}> {
  const {
    tenantId,
    userId,
    action,
    severity,
    startDate,
    endDate,
    page = 1,
    limit = 50,
  } = options;
  
  const where: Record<string, unknown> = {};
  
  if (tenantId) where.tenantId = tenantId;
  if (userId) where.userId = userId;
  if (action) where.action = action;
  if (severity) where.severity = severity;
  
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) (where.createdAt as Record<string, Date>).gte = startDate;
    if (endDate) (where.createdAt as Record<string, Date>).lte = endDate;
  }
  
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        action: true,
        severity: true,
        userId: true,
        userEmail: true,
        tenantId: true,
        resourceType: true,
        resourceId: true,
        ipAddress: true,
        success: true,
        createdAt: true,
      },
    }),
    prisma.auditLog.count({ where }),
  ]);
  
  return { logs, total };
}
