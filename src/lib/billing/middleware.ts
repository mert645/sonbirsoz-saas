import { NextResponse } from "next/server";
import { checkUsageLimit, checkFeatureAccess, incrementUsage, UsageMetric } from "./usage";
import { PLAN_LIMITS } from "./plans";

export interface UsageLimitError {
  error: string;
  code: "LIMIT_EXCEEDED" | "FEATURE_DISABLED";
  current?: number;
  limit?: number;
  feature?: string;
}

/**
 * API route'larında kullanım limiti kontrolü için wrapper
 * 
 * Kullanım:
 * ```ts
 * export async function POST(request: Request) {
 *   const limitCheck = await withUsageLimit(tenantId, "ARTICLES");
 *   if (limitCheck) return limitCheck; // Limit aşıldıysa hata döner
 *   
 *   // Normal işlem devam eder...
 * }
 * ```
 */
export async function withUsageLimit(
  tenantId: string,
  metric: UsageMetric
): Promise<NextResponse | null> {
  const result = await checkUsageLimit(tenantId, metric);

  if (!result.allowed) {
    const metricLabels: Record<UsageMetric, string> = {
      ARTICLES: "makale",
      STORAGE_MB: "depolama",
      AI_TOKENS: "AI token",
      USERS: "kullanıcı",
    };

    return NextResponse.json(
      {
        error: `${metricLabels[metric]} limitinize ulaştınız (${result.current}/${result.limit})`,
        code: "LIMIT_EXCEEDED",
        current: result.current,
        limit: result.limit,
      } as UsageLimitError,
      { status: 429 }
    );
  }

  return null;
}

/**
 * Özellik erişim kontrolü için wrapper
 * 
 * Kullanım:
 * ```ts
 * export async function POST(request: Request) {
 *   const featureCheck = await withFeatureAccess(tenantId, "aiGeneration");
 *   if (featureCheck) return featureCheck; // Özellik kapalıysa hata döner
 *   
 *   // Normal işlem devam eder...
 * }
 * ```
 */
export async function withFeatureAccess(
  tenantId: string,
  feature: keyof typeof PLAN_LIMITS.STARTER.features
): Promise<NextResponse | null> {
  const hasAccess = await checkFeatureAccess(tenantId, feature);

  if (!hasAccess) {
    const featureLabels: Record<string, string> = {
      aiGeneration: "AI İçerik Üretimi",
      aiModeration: "AI Moderasyon",
      videoStudio: "Video Stüdyosu",
      newsletter: "Newsletter",
      pushNotifications: "Push Bildirimleri",
      customDomain: "Özel Domain",
      apiAccess: "API Erişimi",
      prioritySupport: "Öncelikli Destek",
    };

    return NextResponse.json(
      {
        error: `${featureLabels[feature]} özelliği planınızda mevcut değil. Lütfen planınızı yükseltin.`,
        code: "FEATURE_DISABLED",
        feature,
      } as UsageLimitError,
      { status: 403 }
    );
  }

  return null;
}

/**
 * Kullanımı artır ve limit kontrolü yap
 * 
 * Kullanım:
 * ```ts
 * const result = await trackUsage(tenantId, "ARTICLES", 1);
 * if (!result.success) {
 *   return NextResponse.json({ error: result.error }, { status: 429 });
 * }
 * ```
 */
export async function trackUsage(
  tenantId: string,
  metric: UsageMetric,
  amount: number = 1
): Promise<{ success: boolean; newValue?: number; error?: string }> {
  // Önce limit kontrolü
  const limitCheck = await checkUsageLimit(tenantId, metric);
  
  if (!limitCheck.allowed) {
    return {
      success: false,
      error: `Limit aşıldı: ${limitCheck.current}/${limitCheck.limit}`,
    };
  }

  // Kullanımı artır
  const newValue = await incrementUsage(tenantId, metric, amount);

  return { success: true, newValue };
}

/**
 * Makale oluşturma için özel helper
 */
export async function canCreateArticle(tenantId: string): Promise<{
  allowed: boolean;
  error?: string;
}> {
  const result = await checkUsageLimit(tenantId, "ARTICLES");
  
  if (!result.allowed) {
    return {
      allowed: false,
      error: `Bu ay için makale limitinize ulaştınız (${result.current}/${result.limit}). Planınızı yükselterek daha fazla makale oluşturabilirsiniz.`,
    };
  }

  return { allowed: true };
}

/**
 * Kullanıcı ekleme için özel helper
 */
export async function canAddUser(tenantId: string): Promise<{
  allowed: boolean;
  error?: string;
}> {
  const result = await checkUsageLimit(tenantId, "USERS");
  
  if (!result.allowed) {
    return {
      allowed: false,
      error: `Kullanıcı limitinize ulaştınız (${result.current}/${result.limit}). Planınızı yükselterek daha fazla kullanıcı ekleyebilirsiniz.`,
    };
  }

  return { allowed: true };
}

/**
 * AI özelliği kullanımı için özel helper
 */
export async function canUseAI(
  tenantId: string,
  estimatedTokens: number = 1000
): Promise<{
  allowed: boolean;
  error?: string;
}> {
  // Önce özellik erişimi kontrolü
  const hasFeature = await checkFeatureAccess(tenantId, "aiGeneration");
  if (!hasFeature) {
    return {
      allowed: false,
      error: "AI özellikleri planınızda mevcut değil. Professional veya Enterprise plana yükseltin.",
    };
  }

  // Token limiti kontrolü
  const result = await checkUsageLimit(tenantId, "AI_TOKENS");
  if (result.limit !== -1 && result.current + estimatedTokens > result.limit) {
    return {
      allowed: false,
      error: `AI token limitinize yaklaşıyorsunuz (${result.current}/${result.limit}). Bu işlem için yeterli token yok.`,
    };
  }

  return { allowed: true };
}
