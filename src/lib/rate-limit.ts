/**
 * Basit bellek içi rate limiter (sliding window).
 * Lambda/Node instance başına çalışır — küresel garanti WAF'a aittir;
 * bu katman brute-force ve kötüye kullanım için ilk savunma hattıdır.
 */
interface WindowEntry {
  timestamps: number[];
}

const buckets = new Map<string, WindowEntry>();
let lastSweep = Date.now();

function sweep(windowMs: number) {
  // Bellek büyümesini önlemek için ara ara eski kayıtları temizle.
  const now = Date.now();
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, entry] of buckets) {
    entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);
    if (entry.timestamps.length === 0) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * @param key    Benzersiz anahtar (ör. `login:1.2.3.4`)
 * @param limit  Pencere başına izin verilen istek sayısı
 * @param windowMs Pencere süresi (ms)
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  sweep(windowMs);
  const now = Date.now();
  const entry = buckets.get(key) ?? { timestamps: [] };
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

  if (entry.timestamps.length >= limit) {
    const oldest = entry.timestamps[0];
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((oldest + windowMs - now) / 1000),
    };
  }

  entry.timestamps.push(now);
  buckets.set(key, entry);
  return {
    allowed: true,
    remaining: limit - entry.timestamps.length,
    retryAfterSeconds: 0,
  };
}

/** İstekten istemci IP'sini çıkarır (CloudFront/ALB arkasında). */
export function clientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return headers.get("x-real-ip") || "unknown";
}
