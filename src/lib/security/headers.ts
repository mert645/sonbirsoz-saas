/**
 * Security Headers ve CSRF Koruması
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { randomBytes, createHmac } from "crypto";

// CSRF Token için secret (production'da env'den alınmalı)
const CSRF_SECRET = process.env.CSRF_SECRET || process.env.NEXTAUTH_SECRET || "csrf-secret-key";
const CSRF_TOKEN_EXPIRY = 60 * 60 * 1000; // 1 saat

/**
 * Güvenlik header'larını response'a ekler
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  // XSS koruması
  response.headers.set("X-XSS-Protection", "1; mode=block");
  
  // Clickjacking koruması
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  
  // MIME type sniffing koruması
  response.headers.set("X-Content-Type-Options", "nosniff");
  
  // Referrer policy
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  
  // Permissions policy
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  );
  
  // HSTS (production'da aktif)
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }
  
  return response;
}

/**
 * CSRF token oluşturur
 */
export function generateCsrfToken(sessionId: string): string {
  const timestamp = Date.now().toString(36);
  const random = randomBytes(16).toString("hex");
  const data = `${sessionId}:${timestamp}:${random}`;
  
  const signature = createHmac("sha256", CSRF_SECRET)
    .update(data)
    .digest("hex");
  
  return `${data}:${signature}`;
}

/**
 * CSRF token'ı doğrular
 */
export function validateCsrfToken(token: string, sessionId: string): boolean {
  if (!token || typeof token !== "string") return false;
  
  const parts = token.split(":");
  if (parts.length !== 4) return false;
  
  const [tokenSessionId, timestamp, random, signature] = parts;
  
  // Session ID eşleşmeli
  if (tokenSessionId !== sessionId) return false;
  
  // Timestamp kontrolü (expiry)
  const tokenTime = parseInt(timestamp, 36);
  if (isNaN(tokenTime) || Date.now() - tokenTime > CSRF_TOKEN_EXPIRY) {
    return false;
  }
  
  // Signature doğrulama
  const data = `${tokenSessionId}:${timestamp}:${random}`;
  const expectedSignature = createHmac("sha256", CSRF_SECRET)
    .update(data)
    .digest("hex");
  
  // Timing-safe comparison
  if (signature.length !== expectedSignature.length) return false;
  
  let result = 0;
  for (let i = 0; i < signature.length; i++) {
    result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
  }
  
  return result === 0;
}

/**
 * Request'in güvenli origin'den gelip gelmediğini kontrol eder
 */
export function validateOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  
  // Origin header yoksa (same-origin request)
  if (!origin) return true;
  
  try {
    const originUrl = new URL(origin);
    const hostWithoutPort = host?.split(":")[0];
    
    // Development ortamı
    if (process.env.NODE_ENV === "development") {
      if (originUrl.hostname === "localhost" || originUrl.hostname === "127.0.0.1") {
        return true;
      }
    }
    
    // Origin host ile eşleşmeli
    if (originUrl.hostname === hostWithoutPort) {
      return true;
    }
    
    // Allowed origins listesi (env'den)
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean);
    
    if (allowedOrigins.includes(origin)) {
      return true;
    }
    
    return false;
  } catch {
    return false;
  }
}

/**
 * Referer header'ını kontrol eder
 */
export function validateReferer(request: NextRequest): boolean {
  const referer = request.headers.get("referer");
  const host = request.headers.get("host");
  
  // Referer yoksa (bazı privacy ayarlarında normal)
  if (!referer) return true;
  
  try {
    const refererUrl = new URL(referer);
    const hostWithoutPort = host?.split(":")[0];
    
    // Development
    if (process.env.NODE_ENV === "development") {
      if (refererUrl.hostname === "localhost" || refererUrl.hostname === "127.0.0.1") {
        return true;
      }
    }
    
    return refererUrl.hostname === hostWithoutPort;
  } catch {
    return false;
  }
}

/**
 * State-changing request'ler için CSRF koruması
 */
export function requireCsrfProtection(request: NextRequest): NextResponse | null {
  // Sadece state-changing metodlar için
  const safeMethods = ["GET", "HEAD", "OPTIONS"];
  if (safeMethods.includes(request.method)) {
    return null;
  }
  
  // Origin kontrolü
  if (!validateOrigin(request)) {
    return NextResponse.json(
      { error: "Invalid origin" },
      { status: 403 }
    );
  }
  
  // Referer kontrolü
  if (!validateReferer(request)) {
    return NextResponse.json(
      { error: "Invalid referer" },
      { status: 403 }
    );
  }
  
  return null;
}

/**
 * IP adresini güvenli şekilde alır
 */
export function getClientIp(request: NextRequest): string {
  // Cloudflare
  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp;
  
  // X-Forwarded-For (ilk IP)
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const ips = forwardedFor.split(",").map((ip) => ip.trim());
    // İlk IP gerçek client IP'si
    if (ips[0]) return ips[0];
  }
  
  // X-Real-IP
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  
  // Fallback
  return "unknown";
}

/**
 * User-Agent'ı parse eder (bot detection için)
 */
export function parseUserAgent(request: NextRequest): {
  isBot: boolean;
  browser: string;
  os: string;
} {
  const ua = request.headers.get("user-agent") || "";
  
  // Bot detection
  const botPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python/i,
    /java/i,
    /perl/i,
    /ruby/i,
    /php/i,
  ];
  
  const isBot = botPatterns.some((pattern) => pattern.test(ua));
  
  // Basit browser detection
  let browser = "Unknown";
  if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Safari")) browser = "Safari";
  else if (ua.includes("Edge")) browser = "Edge";
  
  // Basit OS detection
  let os = "Unknown";
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iOS") || ua.includes("iPhone")) os = "iOS";
  
  return { isBot, browser, os };
}
