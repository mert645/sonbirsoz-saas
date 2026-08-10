import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

// ─── SSM Content Asset Generation API (birincil sağlayıcı) ─────────────
// Görsel üretimi sağlayıcıya özel endpoint'ler kullanır (tek bir /create-image
// endpoint'i YOKTUR):
//   POST /create-image-openai    (gpt-image-1)
//   POST /create-image-stability (sd3.5-large)
//   POST /create-image-flux      (fal-ai/flux-pro/v1.1)
//   POST /create-image-vertex    (imagen-4)
// Her çağrı 202 + { jobId, poll_url } döner; GET /jobs/{jobId} ile poll edilir.
// Tamamlandığında result.public_url (CloudFront CDN) döner.
const SSM_API_URL = (
  process.env.SSM_CONTENT_API_URL ||
  process.env.NEXT_PUBLIC_SSM_CONTENT_API_URL ||
  "https://i3ob0ck5m2.execute-api.eu-central-1.amazonaws.com/prod"
).replace(/\/+$/, "");
const SSM_API_KEY =
  process.env.SSM_CONTENT_API_KEY ||
  process.env.NEXT_PUBLIC_SSM_CONTENT_API_KEY ||
  "";
const SSM_CDN_URL = (
  process.env.SSM_CDN_URL ||
  process.env.NEXT_PUBLIC_SSM_CDN_URL ||
  "https://cdn.aiartists.studio"
).replace(/\/+$/, "");

// Sağlayıcı → endpoint + model eşlemesi. Canlı doğrulamada openai ve stability
// fonlu/çalışır durumda; flux bakiye tükenebiliyor, vertex ara sıra 5xx veriyor.
// Bu yüzden fonlu sağlayıcılar zincirin başında.
type SSMProvider = "openai" | "stability" | "flux" | "vertex";

const SSM_PROVIDERS: Record<
  SSMProvider,
  { endpoint: string; model: string }
> = {
  openai: { endpoint: "/create-image-openai", model: "gpt-image-1" },
  stability: { endpoint: "/create-image-stability", model: "sd3.5-large" },
  flux: { endpoint: "/create-image-flux", model: "fal-ai/flux-pro/v1.1" },
  vertex: { endpoint: "/create-image-vertex", model: "imagen-4" },
};

const SSM_FALLBACK_ORDER: SSMProvider[] = [
  "openai",
  "stability",
  "flux",
  "vertex",
];

// Bedrock text-to-image için Stability modelleri yalnızca belirli bölgelerde
// (ör. us-west-2) mevcut. eu-central-1'de görsel modeli yok, bu yüzden
// görsel çağrıları için ayrı bir bölge kullanıyoruz.
const BEDROCK_IMAGE_REGION = process.env.BEDROCK_IMAGE_REGION || "us-west-2";

const bedrockImageClient = new BedrockRuntimeClient({
  region: BEDROCK_IMAGE_REGION,
  credentials:
    process.env.CUSTOM_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID
      ? {
          accessKeyId: (process.env.CUSTOM_AWS_ACCESS_KEY_ID ||
            process.env.AWS_ACCESS_KEY_ID)!,
          secretAccessKey: (process.env.CUSTOM_AWS_SECRET_ACCESS_KEY ||
            process.env.AWS_SECRET_ACCESS_KEY)!,
        }
      : undefined,
});

export type ImagePurpose =
  | "cover"
  | "social_square"
  | "social_story"
  | "thumbnail";

type AspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4";

const PURPOSE_ASPECT: Record<
  ImagePurpose,
  { aspect: AspectRatio; width: number; height: number }
> = {
  cover: { aspect: "16:9", width: 1408, height: 768 },
  social_square: { aspect: "1:1", width: 1024, height: 1024 },
  social_story: { aspect: "9:16", width: 768, height: 1408 },
  thumbnail: { aspect: "16:9", width: 1408, height: 768 },
};

export interface GenerateImageResult {
  imageUrl: string;
  provider: string;
  width: number;
  height: number;
}

// ─── SSM: job oluştur + tamamlanana kadar poll et ──────────────────────

interface SSMJobCreate {
  jobId?: string;
  status?: string;
  poll_url?: string;
  service?: string;
  error?: string;
  code?: string;
}

interface SSMJobResult {
  success?: boolean;
  images?: { url?: string; public_url?: string; width?: number; height?: number }[];
  url?: string;
  urls?: string[];
  public_url?: string;
  cdnUrl?: string;
  width?: number;
  height?: number;
  error?: string | null;
}

interface SSMJobPoll {
  jobId: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  error?: string;
  result?: SSMJobResult;
}

const POLL_INTERVAL_MS = 2500;
const POLL_MAX_ATTEMPTS = 48; // ~2 dk

class SSMAuthError extends Error {}

// SSM bazen dahili s3:// URI'si döndürebilir; tarayıcı render edemez. Public
// CloudFront CDN'ine çevir.
function toCdnUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("s3://")) {
    const path = url.replace(/^s3:\/\/[^/]+\//, "");
    return `${SSM_CDN_URL}/${path}`;
  }
  if (url.startsWith("http://")) return url.replace("http://", "https://");
  return url;
}

function extractUrl(result: SSMJobResult | undefined): {
  url: string | null;
  width?: number;
  height?: number;
} {
  if (!result) return { url: null };
  const img = result.images?.[0];
  const raw =
    result.public_url ||
    result.cdnUrl ||
    result.url ||
    result.urls?.[0] ||
    img?.public_url ||
    img?.url ||
    null;
  return {
    url: toCdnUrl(raw),
    width: img?.width ?? result.width,
    height: img?.height ?? result.height,
  };
}

async function generateWithSSM(
  prompt: string,
  aspect: AspectRatio,
  provider: SSMProvider,
): Promise<{ url: string; width?: number; height?: number } | null> {
  if (!SSM_API_KEY) return null;

  const { endpoint, model } = SSM_PROVIDERS[provider];

  const payload: Record<string, unknown> = {
    prompt: prompt.slice(0, 4000),
    negative_prompt:
      "text, typography, letters, words, watermark, logo, blurry, low quality",
    aspect_ratio: aspect,
    model,
    quality: "high",
  };
  if (provider === "openai") {
    payload.size =
      aspect === "1:1"
        ? "1024x1024"
        : aspect === "9:16" || aspect === "3:4"
          ? "1024x1536"
          : "1536x1024";
  } else if (provider === "vertex") {
    payload.person_generation = "allow_all";
  }

  const createRes = await fetch(`${SSM_API_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": SSM_API_KEY,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(20000),
  });

  if (createRes.status === 401 || createRes.status === 403) {
    throw new SSMAuthError(`SSM auth failed: ${createRes.status}`);
  }
  if (!createRes.ok) return null;

  const job = (await createRes.json()) as SSMJobCreate;

  // Bazı sağlayıcılar senkron dönebilir (jobId yok, URL hazır).
  if (!job.jobId) {
    const immediate = extractUrl(job as unknown as SSMJobResult);
    return immediate.url
      ? { url: immediate.url, width: immediate.width, height: immediate.height }
      : null;
  }

  for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    const pollRes = await fetch(`${SSM_API_URL}/jobs/${job.jobId}`, {
      headers: { "x-api-key": SSM_API_KEY },
      signal: AbortSignal.timeout(15000),
    });
    if (pollRes.status === 401 || pollRes.status === 403) {
      throw new SSMAuthError(`SSM auth failed: ${pollRes.status}`);
    }
    if (!pollRes.ok) continue;

    const status = (await pollRes.json()) as SSMJobPoll;

    if (status.status === "COMPLETED") {
      const { url, width, height } = extractUrl(status.result);
      return url ? { url, width, height } : null;
    }
    if (status.status === "FAILED") return null;
  }
  return null;
}

// Fonlu sağlayıcı bulunana kadar zinciri yürü. Auth hatasında SSM'i tamamen bırak.
async function generateWithSSMChain(
  prompt: string,
  aspect: AspectRatio,
): Promise<{ url: string; provider: string; width?: number; height?: number } | null> {
  if (!SSM_API_KEY) return null;

  for (const provider of SSM_FALLBACK_ORDER) {
    try {
      const res = await generateWithSSM(prompt, aspect, provider);
      if (res?.url) {
        return { ...res, provider: `ssm_${provider}` };
      }
    } catch (err) {
      if (err instanceof SSMAuthError) {
        // Auth sorunu tüm SSM sağlayıcılarını etkiler; devam etme.
        break;
      }
      // Diğer hatalarda bir sonraki sağlayıcıyı dene.
    }
  }
  return null;
}

// ─── Submit + Poll (edge 30sn timeout'unu aşmadan asenkron üretim) ─────
// Tarayıcıdan tetiklenen üretimde tüm zinciri senkron beklemek CloudFront'un
// 30sn kenar limitini aşar (504). Bunun yerine job'ı submit edip jobId döneriz;
// istemci ayrı bir hafif uçtan poll eder.

export interface SubmitImageJobResult {
  jobId: string;
  provider: SSMProvider;
}

export interface PollImageJobResult {
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "UNKNOWN";
  imageUrl: string | null;
  width?: number;
  height?: number;
}

/**
 * Görsel üretim işini submit et ve hemen dön (poll etme). SSM zincirinde ilk
 * kabul eden (202 + jobId) sağlayıcının jobId'sini döndürür. Hiçbir sağlayıcı
 * kabul etmezse (veya SSM yapılandırılmamışsa) null döner.
 */
export async function submitImageJob(
  prompt: string,
  purpose: ImagePurpose,
): Promise<SubmitImageJobResult | null> {
  if (!SSM_API_KEY) return null;
  const { aspect } = PURPOSE_ASPECT[purpose];

  for (const provider of SSM_FALLBACK_ORDER) {
    const { endpoint, model } = SSM_PROVIDERS[provider];
    const payload: Record<string, unknown> = {
      prompt: prompt.slice(0, 4000),
      negative_prompt:
        "text, typography, letters, words, watermark, logo, blurry, low quality",
      aspect_ratio: aspect,
      model,
      quality: "high",
    };
    if (provider === "openai") {
      payload.size =
        aspect === "1:1"
          ? "1024x1024"
          : aspect === "9:16" || aspect === "3:4"
            ? "1024x1536"
            : "1536x1024";
    } else if (provider === "vertex") {
      payload.person_generation = "allow_all";
    }

    try {
      const res = await fetch(`${SSM_API_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": SSM_API_KEY,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(20000),
      });
      if (res.status === 401 || res.status === 403) break; // auth → tüm SSM'i bırak
      if (!res.ok) continue;
      const job = (await res.json()) as SSMJobCreate;
      if (job.jobId) return { jobId: job.jobId, provider };
    } catch {
      // Bir sonraki sağlayıcıyı dene.
    }
  }
  return null;
}

/** Bir görsel job'ını tek seferde poll et (döngü yok). */
export async function pollImageJob(jobId: string): Promise<PollImageJobResult> {
  if (!SSM_API_KEY) return { status: "UNKNOWN", imageUrl: null };
  try {
    const res = await fetch(`${SSM_API_URL}/jobs/${jobId}`, {
      headers: { "x-api-key": SSM_API_KEY },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return { status: "UNKNOWN", imageUrl: null };
    const job = (await res.json()) as SSMJobPoll;
    if (job.status === "COMPLETED") {
      const { url, width, height } = extractUrl(job.result);
      return { status: "COMPLETED", imageUrl: url, width, height };
    }
    return { status: job.status || "UNKNOWN", imageUrl: null };
  } catch {
    return { status: "UNKNOWN", imageUrl: null };
  }
}

// ─── OpenAI gpt-image-1 (opsiyonel fallback) ───────────────────────────

async function generateWithOpenAI(
  prompt: string,
  aspect: AspectRatio,
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const size =
    aspect === "1:1"
      ? "1024x1024"
      : aspect === "9:16" || aspect === "3:4"
        ? "1024x1536"
        : "1536x1024";

  try {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt: prompt.slice(0, 4000),
        n: 1,
        size,
        quality: "medium",
      }),
      signal: AbortSignal.timeout(90000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const b64 = data?.data?.[0]?.b64_json;
    return b64 ? `data:image/png;base64,${b64}` : null;
  } catch {
    return null;
  }
}

// ─── AWS Bedrock Stability (çalışan görsel fallback, base64) ───────────
// Stability text-to-image modelleri yalnızca belirli bölgelerde (us-west-2)
// mevcut ve yeni istek şemasını kullanır: { prompt, mode, aspect_ratio }.

function hasBedrockCreds(): boolean {
  return !!(
    (process.env.CUSTOM_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID) &&
    (process.env.CUSTOM_AWS_SECRET_ACCESS_KEY ||
      process.env.AWS_SECRET_ACCESS_KEY)
  );
}

/** Herhangi bir görsel sağlayıcısının yapılandırılıp yapılandırılmadığını kontrol et */
export function hasAnyImageProvider(): boolean {
  const hasSSM = !!(
    process.env.SSM_CONTENT_API_KEY ||
    process.env.NEXT_PUBLIC_SSM_CONTENT_API_KEY
  );
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasBedrock = hasBedrockCreds();
  return hasSSM || hasOpenAI || hasBedrock;
}

// Denenecek modeller (kalite → hız sırası). İlk erişilebilir olan kullanılır.
const BEDROCK_IMAGE_MODELS = [
  "stability.stable-image-ultra-v1:1",
  "stability.sd3-5-large-v1:0",
  "stability.stable-image-core-v1:1",
];

async function generateWithBedrockStability(
  prompt: string,
  aspect: AspectRatio,
): Promise<string | null> {
  if (!hasBedrockCreds()) return null;

  const body = JSON.stringify({
    prompt: prompt.slice(0, 2000),
    mode: "text-to-image",
    aspect_ratio: aspect,
    output_format: "png",
  });

  for (const modelId of BEDROCK_IMAGE_MODELS) {
    try {
      const command = new InvokeModelCommand({
        modelId,
        contentType: "application/json",
        accept: "application/json",
        body: new TextEncoder().encode(body),
      });
      const response = await bedrockImageClient.send(command);
      const parsed = JSON.parse(new TextDecoder().decode(response.body));
      const b64 = parsed.images?.[0] || parsed.artifacts?.[0]?.base64;
      if (b64) return `data:image/png;base64,${b64}`;
    } catch {
      // Bir sonraki modeli dene.
    }
  }
  return null;
}

// ─── Ana fonksiyon: sağlayıcı zinciriyle görsel üret ───────────────────

export async function generateImage(
  prompt: string,
  purpose: ImagePurpose,
): Promise<GenerateImageResult> {
  const { aspect, width, height } = PURPOSE_ASPECT[purpose];

  // 1) SSM Content API — çalışan sağlayıcı bulunana kadar zinciri yürü,
  //    hosted CDN URL döner (tercih edilen)
  const ssm = await generateWithSSMChain(prompt, aspect);
  if (ssm?.url) {
    return {
      imageUrl: ssm.url,
      provider: ssm.provider,
      width: ssm.width || width,
      height: ssm.height || height,
    };
  }

  // 2) OpenAI gpt-image-1 (base64)
  const openai = await generateWithOpenAI(prompt, aspect);
  if (openai) {
    return { imageUrl: openai, provider: "openai_gpt_image", width, height };
  }

  // 3) AWS Bedrock Stability (base64) — us-west-2'de çalışan modeller
  const stability = await generateWithBedrockStability(prompt, aspect);
  if (stability) {
    return {
      imageUrl: stability,
      provider: "bedrock_stability",
      width,
      height,
    };
  }

  throw new Error(
    "Görsel üretilemedi. SSM_CONTENT_API_KEY, OPENAI_API_KEY veya AWS Bedrock kimlik bilgilerinden en az biri yapılandırılmalı.",
  );
}

export function buildNewsImagePrompt(title: string, category: string): string {
  const categoryStyles: Record<string, string> = {
    ekonomi:
      "professional corporate environment, financial charts, modern office, stock market",
    spor: "dynamic sports action, stadium, athletic competition, energetic",
    teknoloji:
      "futuristic technology, modern devices, digital innovation, clean design",
    saglik: "medical research, healthcare, modern hospital, clean and bright",
    dunya: "international diplomacy, world landmarks, global politics",
    gundem:
      "Turkish cityscape, modern Turkey, news journalism, documentary style",
    kultur: "art gallery, cultural event, performance, creative expression",
    yasam: "lifestyle, urban living, daily life, vibrant colors",
    politika: "government building, political scene, press conference, official",
    magazin: "entertainment, celebrity culture, glamour, media event",
  };

  const style = categoryStyles[category] || categoryStyles.gundem;

  return `Professional editorial news photograph illustrating: "${title}". Style: ${style}. High quality, photorealistic, 4K, natural lighting, no text overlay, no watermarks, no logos.`;
}
