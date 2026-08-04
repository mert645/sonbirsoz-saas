import { SITE_URL } from "@/lib/utils/constants";

export async function submitToIndexNow(urls: string[]): Promise<boolean> {
  const key = process.env.INDEXNOW_KEY;
  if (!key) {
    console.warn("IndexNow key not configured");
    return false;
  }

  try {
    const response = await fetch("https://api.indexnow.org/IndexNow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        host: new URL(SITE_URL).hostname,
        key,
        keyLocation: `${SITE_URL}/${key}.txt`,
        urlList: urls,
      }),
    });
    return response.ok || response.status === 202;
  } catch (error) {
    console.error("IndexNow submission failed:", error);
    return false;
  }
}
