import { NextResponse } from "next/server";

/**
 * Basit in-memory rate limiter
 * Production'da Redis kullanılmalı
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Her dakika temizlik
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000);

export interface RateLimitConfig {
  windowMs: number;  // Zaman penceresi (ms)
  maxRequests: number;  // Maksimum istek sayısı
}

/**
 * Plan bazlı rate limit konfigürasyonu
 */
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Enterprise: 1000 istek/dakika
  ENTERPRISE: {
    windowMs: 60 * 1000,
    maxRequests: 1000,
  },
  // Professional: 100 istek/dakika (API erişimi yok ama gelecek için)
  PROFESSIONAL: {
    windowMs: 60 * 1000,
    maxRequests: 100,
  },
  // Starter: 10 istek/dakika (API erişimi yok ama gelecek için)
  STARTER: {
    windowMs: 60 * 1000,
    maxRequests: 10,
  },
  // Default
  DEFAULT: {
    windowMs: 60 * 1000,
    maxRequests: 60,
  },
};

/**
 * Rate limit kontrolü yapar
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig = RATE_LIMITS.DEFAULT
): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt < now) {
    // Yeni pencere başlat
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + config.windowMs,
    });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: now + config.windowMs,
    };
  }

  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Rate limit middleware
 */
export function withRateLimit(
  tenantId: string,
  endpoint: string,
  plan: string = "DEFAULT"
): NextResponse | null {
  const key = `${tenantId}:${endpoint}`;
  const config = RATE_LIMITS[plan] || RATE_LIMITS.DEFAULT;
  const result = checkRateLimit(key, config);

  if (!result.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: "Rate limit aşıldı. Lütfen daha sonra tekrar deneyin.",
        retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": config.maxRequests.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": result.resetAt.toString(),
          "Retry-After": Math.ceil((result.resetAt - Date.now()) / 1000).toString(),
        },
      }
    );
  }

  return null;
}

/**
 * Rate limit header'larını response'a ekler
 */
export function addRateLimitHeaders(
  response: NextResponse,
  tenantId: string,
  endpoint: string,
  plan: string = "DEFAULT"
): NextResponse {
  const key = `${tenantId}:${endpoint}`;
  const config = RATE_LIMITS[plan] || RATE_LIMITS.DEFAULT;
  const entry = rateLimitStore.get(key);

  if (entry) {
    response.headers.set("X-RateLimit-Limit", config.maxRequests.toString());
    response.headers.set(
      "X-RateLimit-Remaining",
      Math.max(0, config.maxRequests - entry.count).toString()
    );
    response.headers.set("X-RateLimit-Reset", entry.resetAt.toString());
  }

  return response;
}
