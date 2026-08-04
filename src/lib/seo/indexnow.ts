import { SITE_URL } from "@/lib/utils/constants";

/**
 * IndexNow — yayınlanan URL'leri Bing/Yandex/Seznam gibi motorlara anında bildirir.
 * Anahtar: INDEXNOW_KEY env değişkeni; doğrulama dosyası /{key}.txt route'u ile sunulur.
 * Gönderim best-effort'tur, asla yayın akışını bloklamaz.
 */
export async function pingIndexNow(urls: string[]): Promise<boolean> {
  const key = process.env.INDEXNOW_KEY;
  if (!key || urls.length === 0) return false;

  const host = new URL(SITE_URL).host;
  try {
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host,
        key,
        keyLocation: `${SITE_URL}/indexnow/${key}.txt`,
        urlList: urls.slice(0, 100),
      }),
      signal: AbortSignal.timeout(5000),
    });
    return res.ok || res.status === 202;
  } catch {
    return false;
  }
}
