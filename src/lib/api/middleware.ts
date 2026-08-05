import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, hasScope, ApiScope } from "./keys";

export interface ApiContext {
  tenantId: string;
  scopes: string[];
}

/**
 * API Key doğrulama middleware'i
 * 
 * Kullanım:
 * ```ts
 * export async function GET(request: NextRequest) {
 *   const ctx = await withApiKey(request, "articles:read");
 *   if (ctx instanceof NextResponse) return ctx; // Hata durumu
 *   
 *   // ctx.tenantId ve ctx.scopes kullanılabilir
 * }
 * ```
 */
export async function withApiKey(
  request: NextRequest,
  requiredScope?: ApiScope
): Promise<ApiContext | NextResponse> {
  // Authorization header'dan API key al
  const authHeader = request.headers.get("authorization");
  
  if (!authHeader) {
    return NextResponse.json(
      { error: "Authorization header gerekli" },
      { status: 401 }
    );
  }

  // Bearer token formatı
  const [type, key] = authHeader.split(" ");
  
  if (type !== "Bearer" || !key) {
    return NextResponse.json(
      { error: "Geçersiz authorization formatı. 'Bearer <api_key>' kullanın" },
      { status: 401 }
    );
  }

  // API key doğrula
  const result = await validateApiKey(key);
  
  if (!result.valid) {
    return NextResponse.json(
      { error: result.error || "Geçersiz API key" },
      { status: 401 }
    );
  }

  // Scope kontrolü
  if (requiredScope && !hasScope(result.scopes!, requiredScope)) {
    return NextResponse.json(
      { error: `Bu işlem için '${requiredScope}' yetkisi gerekli` },
      { status: 403 }
    );
  }

  return {
    tenantId: result.tenantId!,
    scopes: result.scopes!,
  };
}

/**
 * Rate limit kontrolü için helper
 */
export function getRateLimitKey(tenantId: string, endpoint: string): string {
  return `ratelimit:${tenantId}:${endpoint}`;
}

/**
 * API yanıt formatı
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

/**
 * Başarılı API yanıtı oluşturur
 */
export function apiSuccess<T>(data: T, meta?: ApiResponse<T>["meta"]): NextResponse {
  return NextResponse.json({
    success: true,
    data,
    ...(meta && { meta }),
  });
}

/**
 * Hata API yanıtı oluşturur
 */
export function apiError(error: string, status: number = 400): NextResponse {
  return NextResponse.json(
    { success: false, error },
    { status }
  );
}

/**
 * Pagination parametrelerini parse eder
 */
export function parsePagination(request: NextRequest): {
  page: number;
  limit: number;
  skip: number;
} {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
  const skip = (page - 1) * limit;
  
  return { page, limit, skip };
}

/**
 * Sort parametrelerini parse eder
 */
export function parseSort(
  request: NextRequest,
  allowedFields: string[],
  defaultField: string = "createdAt",
  defaultOrder: "asc" | "desc" = "desc"
): { field: string; order: "asc" | "desc" } {
  const { searchParams } = new URL(request.url);
  const sortParam = searchParams.get("sort") || `${defaultField}:${defaultOrder}`;
  const [field, order] = sortParam.split(":");
  
  return {
    field: allowedFields.includes(field) ? field : defaultField,
    order: order === "asc" ? "asc" : "desc",
  };
}
