import { randomBytes, createHmac } from "crypto";
import { prisma } from "@/lib/db";

/**
 * API Key formatı: sbs_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
 * - sbs: sonbirsoz
 * - live: environment (live/test)
 * - xxx: 32 karakter random string
 */

const API_KEY_PREFIX = "sbs_live_";
const API_KEY_LENGTH = 32;

/**
 * Yeni API key oluşturur
 */
export function generateApiKey(): { key: string; keyPrefix: string } {
  const randomPart = randomBytes(API_KEY_LENGTH).toString("hex").slice(0, API_KEY_LENGTH);
  const key = `${API_KEY_PREFIX}${randomPart}`;
  const keyPrefix = key.slice(0, 13); // "sbs_live_xxxx"
  
  return { key, keyPrefix };
}

/**
 * API key'i hash'ler (veritabanında saklamak için)
 */
export function hashApiKey(key: string): string {
  return createHmac("sha256", process.env.NEXTAUTH_SECRET || "fallback-secret")
    .update(key)
    .digest("hex");
}

/**
 * Webhook secret oluşturur
 */
export function generateWebhookSecret(): string {
  return `whsec_${randomBytes(24).toString("hex")}`;
}

/**
 * Webhook payload'ını imzalar
 */
export function signWebhookPayload(payload: string, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;
  const signature = createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");
  
  return `t=${timestamp},v1=${signature}`;
}

/**
 * Webhook imzasını doğrular
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  tolerance: number = 300 // 5 dakika
): boolean {
  const parts = signature.split(",");
  const timestamp = parseInt(parts.find(p => p.startsWith("t="))?.slice(2) || "0");
  const expectedSig = parts.find(p => p.startsWith("v1="))?.slice(3);
  
  if (!timestamp || !expectedSig) return false;
  
  // Timestamp kontrolü
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > tolerance) return false;
  
  // İmza kontrolü
  const signedPayload = `${timestamp}.${payload}`;
  const computedSig = createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");
  
  return computedSig === expectedSig;
}

/**
 * API Key scope'ları
 */
export const API_SCOPES = {
  "articles:read": "Makaleleri okuma",
  "articles:write": "Makale oluşturma/güncelleme",
  "articles:delete": "Makale silme",
  "categories:read": "Kategorileri okuma",
  "categories:write": "Kategori oluşturma/güncelleme",
  "authors:read": "Yazarları okuma",
  "authors:write": "Yazar oluşturma/güncelleme",
  "media:read": "Medya dosyalarını okuma",
  "media:write": "Medya yükleme",
  "comments:read": "Yorumları okuma",
  "comments:write": "Yorum moderasyonu",
} as const;

export type ApiScope = keyof typeof API_SCOPES;

/**
 * Webhook event türleri
 */
export const WEBHOOK_EVENTS = {
  "article.created": "Makale oluşturulduğunda",
  "article.updated": "Makale güncellendiğinde",
  "article.published": "Makale yayınlandığında",
  "article.deleted": "Makale silindiğinde",
  "comment.created": "Yorum yapıldığında",
  "comment.approved": "Yorum onaylandığında",
  "media.uploaded": "Medya yüklendiğinde",
  "user.invited": "Kullanıcı davet edildiğinde",
} as const;

export type WebhookEvent = keyof typeof WEBHOOK_EVENTS;

/**
 * API key'i doğrular ve tenant bilgisini döndürür
 */
export async function validateApiKey(key: string): Promise<{
  valid: boolean;
  tenantId?: string;
  scopes?: string[];
  error?: string;
}> {
  if (!key || !key.startsWith(API_KEY_PREFIX)) {
    return { valid: false, error: "Geçersiz API key formatı" };
  }

  try {
    const apiKey = await prisma.apiKey.findUnique({
      where: { key },
      include: {
        tenant: {
          select: {
            id: true,
            isActive: true,
            plan: true,
          },
        },
      },
    });

    if (!apiKey) {
      return { valid: false, error: "API key bulunamadı" };
    }

    if (!apiKey.isActive) {
      return { valid: false, error: "API key devre dışı" };
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return { valid: false, error: "API key süresi dolmuş" };
    }

    if (!apiKey.tenant.isActive) {
      return { valid: false, error: "Tenant aktif değil" };
    }

    // Enterprise plan kontrolü
    if (apiKey.tenant.plan !== "ENTERPRISE") {
      return { valid: false, error: "API erişimi sadece Enterprise plan için geçerlidir" };
    }

    // Son kullanım bilgisini güncelle (async, beklemeden)
    prisma.apiKey.update({
      where: { id: apiKey.id },
      data: {
        lastUsedAt: new Date(),
      },
    }).catch(console.error);

    return {
      valid: true,
      tenantId: apiKey.tenantId,
      scopes: apiKey.scopes,
    };
  } catch (error) {
    console.error("API key validation error:", error);
    return { valid: false, error: "Doğrulama hatası" };
  }
}

/**
 * Scope kontrolü yapar
 */
export function hasScope(userScopes: string[], requiredScope: ApiScope): boolean {
  // Wildcard kontrolü (örn: "articles:*" tüm article scope'larını kapsar)
  const [resource, action] = requiredScope.split(":");
  
  return userScopes.some(scope => {
    if (scope === requiredScope) return true;
    if (scope === `${resource}:*`) return true;
    if (scope === "*") return true;
    return false;
  });
}
