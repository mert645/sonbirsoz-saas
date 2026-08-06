/**
 * Input Sanitization Utilities
 * XSS, SQL Injection ve diğer injection saldırılarına karşı koruma
 */

/**
 * HTML özel karakterlerini escape eder (XSS koruması)
 */
export function escapeHtml(str: string): string {
  if (!str || typeof str !== "string") return "";
  
  const htmlEscapes: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "/": "&#x2F;",
    "`": "&#x60;",
    "=": "&#x3D;",
  };
  
  return str.replace(/[&<>"'`=/]/g, (char) => htmlEscapes[char] || char);
}

/**
 * HTML tag'lerini tamamen kaldırır
 */
export function stripHtml(str: string): string {
  if (!str || typeof str !== "string") return "";
  return str.replace(/<[^>]*>/g, "");
}

/**
 * Tehlikeli karakterleri ve pattern'leri temizler
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== "string") return "";
  
  let sanitized = input
    // Null bytes kaldır
    .replace(/\0/g, "")
    // Control karakterleri kaldır (tab, newline hariç)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    // Unicode kontrol karakterleri
    .replace(/[\u200B-\u200D\uFEFF]/g, "");
  
  // Trim
  sanitized = sanitized.trim();
  
  return sanitized;
}

/**
 * SQL injection pattern'lerini kontrol eder
 * NOT: Prisma zaten parameterized queries kullanır, bu ekstra güvenlik katmanı
 */
export function containsSqlInjection(input: string): boolean {
  if (!input || typeof input !== "string") return false;
  
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|EXEC|EXECUTE|UNION|DECLARE)\b)/i,
    /(--)/, // SQL comment
    /(;)/, // Statement terminator
    /(\bOR\b\s+\d+\s*=\s*\d+)/i, // OR 1=1 pattern
    /(\bAND\b\s+\d+\s*=\s*\d+)/i, // AND 1=1 pattern
    /(\/\*.*\*\/)/, // Block comment
    /(\bWAITFOR\b\s+\bDELAY\b)/i, // Time-based injection
    /(\bBENCHMARK\b\s*\()/i, // MySQL benchmark
    /(\bSLEEP\b\s*\()/i, // MySQL sleep
  ];
  
  return sqlPatterns.some((pattern) => pattern.test(input));
}

/**
 * XSS pattern'lerini kontrol eder
 */
export function containsXss(input: string): boolean {
  if (!input || typeof input !== "string") return false;
  
  const xssPatterns = [
    /<script\b[^>]*>/i,
    /javascript:/i,
    /on\w+\s*=/i, // onclick=, onerror=, etc.
    /data:\s*text\/html/i,
    /vbscript:/i,
    /<iframe\b/i,
    /<object\b/i,
    /<embed\b/i,
    /<form\b[^>]*action/i,
    /expression\s*\(/i, // CSS expression
    /url\s*\(\s*["']?\s*javascript/i,
  ];
  
  return xssPatterns.some((pattern) => pattern.test(input));
}

/**
 * Path traversal saldırılarını kontrol eder
 */
export function containsPathTraversal(input: string): boolean {
  if (!input || typeof input !== "string") return false;
  
  const pathPatterns = [
    /\.\.\//,
    /\.\.\\/, 
    /%2e%2e%2f/i, // URL encoded ../
    /%2e%2e\//i,
    /\.\.%2f/i,
    /%252e%252e%252f/i, // Double URL encoded
  ];
  
  return pathPatterns.some((pattern) => pattern.test(input));
}

/**
 * Email formatını doğrular
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  
  // RFC 5322 uyumlu basit regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!emailRegex.test(email)) return false;
  if (email.length > 254) return false;
  
  // Tehlikeli karakterler kontrolü
  if (containsXss(email) || containsSqlInjection(email)) return false;
  
  return true;
}

/**
 * URL formatını doğrular
 */
export function isValidUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  
  try {
    const parsed = new URL(url);
    // Sadece http ve https protokollerine izin ver
    if (!["http:", "https:"].includes(parsed.protocol)) return false;
    // javascript: ve data: URL'leri engelle
    if (url.toLowerCase().includes("javascript:")) return false;
    if (url.toLowerCase().includes("data:")) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Slug formatını doğrular
 */
export function isValidSlug(slug: string): boolean {
  if (!slug || typeof slug !== "string") return false;
  
  // Sadece küçük harf, rakam ve tire
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  
  if (!slugRegex.test(slug)) return false;
  if (slug.length > 200) return false;
  
  return true;
}

/**
 * Güvenli string uzunluk kontrolü
 */
export function validateLength(
  input: string,
  min: number,
  max: number
): { valid: boolean; error?: string } {
  if (!input || typeof input !== "string") {
    return { valid: false, error: "Geçersiz input" };
  }
  
  if (input.length < min) {
    return { valid: false, error: `En az ${min} karakter olmalı` };
  }
  
  if (input.length > max) {
    return { valid: false, error: `En fazla ${max} karakter olabilir` };
  }
  
  return { valid: true };
}

/**
 * Tüm güvenlik kontrollerini uygular
 */
export function validateAndSanitize(
  input: string,
  options: {
    maxLength?: number;
    minLength?: number;
    allowHtml?: boolean;
    checkSql?: boolean;
    checkXss?: boolean;
    checkPath?: boolean;
  } = {}
): { valid: boolean; sanitized: string; error?: string } {
  const {
    maxLength = 10000,
    minLength = 0,
    allowHtml = false,
    checkSql = true,
    checkXss = true,
    checkPath = true,
  } = options;
  
  if (!input || typeof input !== "string") {
    return { valid: false, sanitized: "", error: "Geçersiz input" };
  }
  
  // Uzunluk kontrolü
  const lengthCheck = validateLength(input, minLength, maxLength);
  if (!lengthCheck.valid) {
    return { valid: false, sanitized: "", error: lengthCheck.error };
  }
  
  // SQL injection kontrolü
  if (checkSql && containsSqlInjection(input)) {
    return { valid: false, sanitized: "", error: "Geçersiz karakterler tespit edildi" };
  }
  
  // XSS kontrolü
  if (checkXss && containsXss(input)) {
    return { valid: false, sanitized: "", error: "Geçersiz içerik tespit edildi" };
  }
  
  // Path traversal kontrolü
  if (checkPath && containsPathTraversal(input)) {
    return { valid: false, sanitized: "", error: "Geçersiz path tespit edildi" };
  }
  
  // Sanitize
  let sanitized = sanitizeInput(input);
  
  // HTML'i kaldır (izin verilmiyorsa)
  if (!allowHtml) {
    sanitized = stripHtml(sanitized);
  }
  
  return { valid: true, sanitized };
}

/**
 * Object içindeki tüm string değerleri sanitize eder
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  options: {
    allowHtml?: boolean;
    maxStringLength?: number;
  } = {}
): T {
  const { allowHtml = false, maxStringLength = 10000 } = options;
  
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      let clean = sanitizeInput(value);
      if (!allowHtml) {
        clean = stripHtml(clean);
      }
      if (clean.length > maxStringLength) {
        clean = clean.slice(0, maxStringLength);
      }
      sanitized[key] = clean;
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>, options);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) => {
        if (typeof item === "string") {
          let clean = sanitizeInput(item);
          if (!allowHtml) clean = stripHtml(clean);
          return clean;
        }
        if (item && typeof item === "object") {
          return sanitizeObject(item as Record<string, unknown>, options);
        }
        return item;
      });
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized as T;
}
