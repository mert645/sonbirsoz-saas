/**
 * YouTube Data API v3 istemcisi — düzgün OAuth 2.0 refresh token akışıyla.
 *
 * Gerekli env değişkenleri:
 * - YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET (Google Cloud OAuth istemcisi)
 * - YOUTUBE_REFRESH_TOKEN (kanal sahibi adına offline izinli refresh token)
 *
 * Refresh token alma (tek seferlik):
 * https://developers.google.com/youtube/v3/guides/auth/server-side-web-apps
 * scope: https://www.googleapis.com/auth/youtube.upload
 */

export function isYouTubeConfigured(): boolean {
  return !!(
    process.env.YOUTUBE_CLIENT_ID &&
    process.env.YOUTUBE_CLIENT_SECRET &&
    process.env.YOUTUBE_REFRESH_TOKEN
  );
}

async function getAccessToken(): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.YOUTUBE_CLIENT_ID!,
      client_secret: process.env.YOUTUBE_CLIENT_SECRET!,
      refresh_token: process.env.YOUTUBE_REFRESH_TOKEN!,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(
      `YouTube OAuth token alınamadı: ${data.error_description || data.error || res.status}`
    );
  }
  return data.access_token as string;
}

export interface YouTubeShortInput {
  /** S3 veya başka bir public kaynaktaki MP4 URL'i */
  videoUrl: string;
  title: string;
  description: string;
  tags?: string[];
  /** public | unlisted | private (varsayılan: public) */
  privacy?: "public" | "unlisted" | "private";
}

/**
 * Dikey videoyu YouTube Shorts olarak yükler (resumable upload).
 * Başarıda video id döner.
 */
export async function uploadYouTubeShort(
  input: YouTubeShortInput
): Promise<{ id: string; url: string }> {
  if (!isYouTubeConfigured()) {
    throw new Error("YouTube OAuth yapılandırılmamış (CLIENT_ID/SECRET/REFRESH_TOKEN)");
  }

  // 1) Videoyu indir
  const videoRes = await fetch(input.videoUrl);
  if (!videoRes.ok) {
    throw new Error(`Video indirilemedi: ${videoRes.status}`);
  }
  const videoBuffer = Buffer.from(await videoRes.arrayBuffer());

  const accessToken = await getAccessToken();

  // 2) Resumable upload oturumu başlat
  // Shorts: 9:16 dikey + <60sn video otomatik Shorts olarak işlenir; #Shorts etiketi eklenir.
  const metadata = {
    snippet: {
      title: input.title.slice(0, 95),
      description: `${input.description}\n\n#Shorts`.slice(0, 4900),
      tags: (input.tags ?? ["haber", "sondakika", "shorts"]).slice(0, 20),
      categoryId: "25", // News & Politics
      defaultLanguage: "tr",
      defaultAudioLanguage: "tr",
    },
    status: {
      privacyStatus: input.privacy ?? "public",
      selfDeclaredMadeForKids: false,
    },
  };

  const initRes = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Length": String(videoBuffer.length),
        "X-Upload-Content-Type": "video/mp4",
      },
      body: JSON.stringify(metadata),
    }
  );
  if (!initRes.ok) {
    const err = await initRes.text();
    throw new Error(`YouTube upload oturumu açılamadı (${initRes.status}): ${err.slice(0, 300)}`);
  }
  const uploadUrl = initRes.headers.get("location");
  if (!uploadUrl) throw new Error("YouTube upload URL alınamadı");

  // 3) Video baytlarını yükle
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(videoBuffer.length),
    },
    body: new Uint8Array(videoBuffer),
  });
  const uploadData = await uploadRes.json().catch(() => ({}));
  if (!uploadRes.ok || !uploadData.id) {
    throw new Error(
      `YouTube video yüklenemedi (${uploadRes.status}): ${JSON.stringify(uploadData).slice(0, 300)}`
    );
  }

  return {
    id: uploadData.id as string,
    url: `https://www.youtube.com/shorts/${uploadData.id}`,
  };
}

export function formatYouTubeContent(
  title: string,
  spot: string,
  url: string
): string {
  return `📰 ${title}\n\n${spot}\n\n🔗 Tam haber: ${url}`;
}
