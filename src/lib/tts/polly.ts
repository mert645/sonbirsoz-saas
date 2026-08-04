import {
  PollyClient,
  SynthesizeSpeechCommand,
  type SynthesizeSpeechCommandInput,
} from "@aws-sdk/client-polly";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/db";

/**
 * Amazon Polly ile sesli haber özeti üretimi.
 * Türkçe neural ses (Burcu) öncelikli; desteklenmezse standart Filiz'e düşer.
 * MP3, S3'e yüklenir ve Article.audioUrl alanına yazılır.
 * Best-effort: yapılandırma eksikse veya hata olursa yayını asla bloklamaz.
 */

const MEDIA_BUCKET = process.env.MEDIA_BUCKET || "sonbirsoz-media-060768936870";
const AUDIO_PREFIX = "audio";
// Polly SynthesizeSpeech karakter limiti 3000 (billed); güvenli pay bırak.
const MAX_CHARS = 2800;

// Bucket'ın bulunduğu bölge. CUSTOM_AWS_REGION Bedrock için farklı bölgeye
// işaret edebildiğinden burada bilinçli olarak ayrı bir env kullanılır.
function getRegion(): string {
  return process.env.MEDIA_REGION || "eu-central-1";
}

function getCredentials() {
  const accessKeyId =
    process.env.CUSTOM_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey =
    process.env.CUSTOM_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) return null;
  return { accessKeyId, secretAccessKey };
}

export function isTtsConfigured(): boolean {
  return !!getCredentials();
}

let pollyClient: PollyClient | null = null;
let s3Client: S3Client | null = null;

function getPolly(): PollyClient | null {
  const credentials = getCredentials();
  if (!credentials) return null;
  if (!pollyClient) {
    pollyClient = new PollyClient({ region: getRegion(), credentials });
  }
  return pollyClient;
}

function getS3(): S3Client | null {
  const credentials = getCredentials();
  if (!credentials) return null;
  if (!s3Client) {
    s3Client = new S3Client({ region: getRegion(), credentials });
  }
  return s3Client;
}

/** HTML içeriği düz metne çevirir (etiketler, script/style ve entity'ler temizlenir). */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<\/(p|div|h[1-6]|li|br)>/gi, ". ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .replace(/(\.\s*)+/g, ". ")
    .trim();
}

/** Başlık + spot + içerik girişinden Polly için okunacak metni hazırlar. */
export function buildSpeechText(article: {
  title: string;
  spot: string | null;
  content: string;
}): string {
  const body = htmlToPlainText(article.content);
  const parts = [article.title.trim()];
  if (article.spot?.trim()) parts.push(article.spot.trim());
  parts.push(body);

  let text = parts.join(". ").replace(/\.\.+/g, ".");
  if (text.length > MAX_CHARS) {
    // Cümle sınırında kes ki okuma yarıda kalmasın
    const cut = text.slice(0, MAX_CHARS);
    const lastDot = cut.lastIndexOf(".");
    text = lastDot > MAX_CHARS / 2 ? cut.slice(0, lastDot + 1) : cut;
  }
  return text;
}

async function synthesize(text: string): Promise<Uint8Array | null> {  const polly = getPolly();
  if (!polly) return null;

  const base: Omit<SynthesizeSpeechCommandInput, "Engine" | "VoiceId"> = {
    OutputFormat: "mp3",
    Text: text,
    TextType: "text",
    LanguageCode: "tr-TR",
    SampleRate: "24000",
  };

  // Önce neural Burcu, bölgede desteklenmiyorsa standart Filiz
  const attempts: { engine: "neural" | "standard"; voice: "Burcu" | "Filiz" }[] = [
    { engine: "neural", voice: "Burcu" },
    { engine: "standard", voice: "Filiz" },
  ];

  for (const attempt of attempts) {
    try {
      const res = await polly.send(
        new SynthesizeSpeechCommand({
          ...base,
          Engine: attempt.engine,
          VoiceId: attempt.voice,
        })
      );
      if (res.AudioStream) {
        return await res.AudioStream.transformToByteArray();
      }
    } catch (error) {
      console.warn(`Polly ${attempt.engine}/${attempt.voice} failed:`, error);
    }
  }
  return null;
}

/**
 * Makale için sesli özet üretir, S3'e yükler ve audioUrl'i günceller.
 * Başarıda public MP3 URL'i, aksi halde null döner.
 */export async function generateArticleAudio(articleId: string): Promise<string | null> {
  const s3 = getS3();
  if (!s3 || !isTtsConfigured()) return null;

  try {
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      select: { id: true, slug: true, title: true, spot: true, content: true },
    });
    if (!article) return null;

    const text = buildSpeechText(article);
    if (text.length < 40) return null;

    const audio = await synthesize(text);
    if (!audio || audio.length === 0) return null;

    const key = `${AUDIO_PREFIX}/${article.slug}-${article.id.slice(-8)}.mp3`;
    await s3.send(
      new PutObjectCommand({
        Bucket: MEDIA_BUCKET,
        Key: key,
        Body: audio,
        ContentType: "audio/mpeg",
        CacheControl: "public, max-age=31536000, immutable",
      })
    );

    const url = `https://${MEDIA_BUCKET}.s3.${getRegion()}.amazonaws.com/${key}`;
    await prisma.article.update({
      where: { id: articleId },
      data: { audioUrl: url },
    });
    return url;
  } catch (error) {
    console.error("Article audio generation failed:", error);
    return null;
  }
}

// ─── Video pipeline'ın da kullandığı paylaşılan yardımcılar ───

/** Polly ile ham ses (MP3) üretir — video seslendirmesi için de kullanılır. */
export { synthesize as synthesizeSpeech };

/** Medya bucket'ına dosya yükler ve public URL döner (yapılandırma yoksa null). */
export async function uploadMediaObject(
  key: string,
  body: Uint8Array | Buffer,
  contentType: string
): Promise<string | null> {
  const s3 = getS3();
  if (!s3) return null;
  await s3.send(
    new PutObjectCommand({
      Bucket: MEDIA_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );
  return `https://${MEDIA_BUCKET}.s3.${getRegion()}.amazonaws.com/${key}`;
}
