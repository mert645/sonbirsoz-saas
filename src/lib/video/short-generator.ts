import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile, access, rename } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { prisma } from "@/lib/db";
import {
  htmlToPlainText,
  isTtsConfigured,
  synthesizeSpeech,
  uploadMediaObject,
} from "@/lib/tts/polly";

/**
 * Image-to-video pipeline (Shorts/TikTok/Reels):
 * haber kapak görseli üzerinde Ken Burns efekti + Polly seslendirme +
 * başlık/alt yazı bindirme → 1080x1920 (9:16) dikey MP4.
 * İş takibi MediaGeneration (purpose: VIDEO) üzerinden yapılır.
 */

// Kalite profili: Amplify SSR Lambda'sının ~30 sn cevap penceresine sığması
// için serverless'ta 720x1280@24fps + ultrafast, yerelde 1080x1920@30fps.
const IS_SERVERLESS = !!process.env.FFMPEG_BINARY_URL && !getFfmpegStaticPathSafe();
const FPS = IS_SERVERLESS ? 24 : 30;
const WIDTH = IS_SERVERLESS ? 720 : 1080;
const HEIGHT = IS_SERVERLESS ? 1280 : 1920;
const X264_PRESET = IS_SERVERLESS ? "ultrafast" : "fast";
// Seslendirme metni limiti (~20-40 sn video)
const MAX_NARRATION_CHARS = IS_SERVERLESS ? 420 : 700;

function getFfmpegStaticPathSafe(): string | null {
  try {
    // İsteğe bağlı yerel geliştirme bağımlılığı — eval(require) ile çağrılır ki
    // bundler binary'yi Lambda paketine izlemesin (boyut limiti).
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const req = eval("require") as NodeRequire;
    const ffmpegStatic = req("ffmpeg-static") as string | null;
    return ffmpegStatic;
  } catch {
    return null;
  }
}

function getFfmpegStaticPath(): string | null {
  return getFfmpegStaticPathSafe();
}

// Lambda'da ffmpeg binary'si paket boyut limitine sığmadığı için S3'ten
// /tmp'ye indirilir ve warm invocation'lar arasında cache'lenir.
const LAMBDA_FFMPEG_PATH = "/tmp/sbs-ffmpeg";
let ffmpegDownloadPromise: Promise<string | null> | null = null;

async function downloadFfmpegToTmp(url: string): Promise<string | null> {
  try {
    await access(LAMBDA_FFMPEG_PATH);
    return LAMBDA_FFMPEG_PATH;
  } catch {
    // yok — indir
  }
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`ffmpeg indirilemedi: ${res.status}`);
      return null;
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 10_000_000) {
      console.error("ffmpeg indirmesi beklenenden küçük, geçersiz olabilir");
      return null;
    }
    const partial = `${LAMBDA_FFMPEG_PATH}.part`;
    await writeFile(partial, buffer, { mode: 0o755 });
    await rename(partial, LAMBDA_FFMPEG_PATH);
    return LAMBDA_FFMPEG_PATH;
  } catch (error) {
    console.error("ffmpeg indirme hatası:", error);
    return null;
  }
}

/**
 * Kullanılabilir bir ffmpeg binary'si çözer:
 * 1) yerel geliştirme → ffmpeg-static (node_modules)
 * 2) Lambda → FFMPEG_BINARY_URL'den /tmp'ye indirilen static binary
 */
async function resolveFfmpeg(): Promise<string | null> {
  const local = getFfmpegStaticPath();
  if (local) {
    try {
      await access(local);
      return local;
    } catch {
      // bundle'a dahil edilmemiş — indirmeye düş
    }
  }
  const url = process.env.FFMPEG_BINARY_URL;
  if (!url) return null;
  if (!ffmpegDownloadPromise) {
    ffmpegDownloadPromise = downloadFfmpegToTmp(url).then((result) => {
      if (!result) ffmpegDownloadPromise = null;
      return result;
    });
  }
  return ffmpegDownloadPromise;
}

export function isVideoConfigured(): boolean {
  return (
    isTtsConfigured() &&
    (!!getFfmpegStaticPath() || !!process.env.FFMPEG_BINARY_URL)
  );
}

function run(cmd: string, args: string[]): Promise<{ code: number; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args);
    let stderr = "";
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("error", reject);
    child.on("close", (code) => resolve({ code: code ?? 1, stderr }));
  });
}

/** ffmpeg stderr çıktısından ses süresini (sn) okur. */
async function getAudioDuration(ffmpeg: string, file: string): Promise<number> {
  const { stderr } = await run(ffmpeg, ["-i", file, "-f", "null", "-"]);
  const match = stderr.match(/time=(\d+):(\d+):(\d+\.?\d*)/g);
  if (!match) return 30;
  const last = match[match.length - 1].replace("time=", "");
  const [h, m, s] = last.split(":").map(Number);
  return h * 3600 + m * 60 + s;
}

/** drawtext için kullanılabilir bir font dosyası bulur (yoksa null → yazısız video). */
async function resolveFontFile(): Promise<string | null> {
  const candidates = [
    // Repo içine konabilecek özel font
    path.join(process.cwd(), "assets", "fonts", "subtitle.ttf"),
    // macOS
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "/Library/Fonts/Arial.ttf",
    // Linux (Lambda katmanı / container)
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf",
  ];
  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // sıradakine bak
    }
  }
  return null;
}

/** drawtext filtresi için metni kaçışlar ve satırlara böler. */
function escapeDrawtext(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\u2019")
    .replace(/:/g, "\\:")
    .replace(/%/g, "\\%")
    .replace(/,/g, "\\,");
}

function wrapText(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > maxChars) {
      lines.push(current.trim());
      current = word;
      if (lines.length === maxLines) break;
    } else {
      current = `${current} ${word}`;
    }
  }
  if (lines.length < maxLines && current.trim()) lines.push(current.trim());
  if (lines.length === maxLines && words.join(" ").length > lines.join(" ").length + 10) {
    lines[maxLines - 1] = lines[maxLines - 1].replace(/\s+\S*$/, "") + "…";
  }
  return lines;
}

function buildNarration(article: {
  title: string;
  spot: string | null;
  content: string;
}): string {
  const parts = [article.title.trim()];
  if (article.spot?.trim()) parts.push(article.spot.trim());
  const body = htmlToPlainText(article.content);
  let text = parts.join(". ");
  if (text.length < 200 && body) text = `${text}. ${body}`;
  text = text.replace(/\.\.+/g, ".");
  if (text.length > MAX_NARRATION_CHARS) {
    const cut = text.slice(0, MAX_NARRATION_CHARS);
    const lastDot = cut.lastIndexOf(".");
    text = lastDot > MAX_NARRATION_CHARS / 2 ? cut.slice(0, lastDot + 1) : cut;
  }
  return text;
}

async function downloadImage(url: string, dest: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (sonbirsoz-video-pipeline)" },
    });
    if (!res.ok) return false;
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 1000) return false;
    await writeFile(dest, buffer);
    return true;
  } catch {
    return false;
  }
}

/**
 * Makale için 9:16 dikey haber videosu üretir, S3'e yükler.
 * MediaGeneration kaydı üzerinden durum takibi yapılır; iş id'si döner.
 */
export async function generateArticleShort(articleId: string): Promise<{
  jobId: string;
  status: "COMPLETED" | "FAILED";
  resultUrl?: string;
  error?: string;
}> {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: {
      id: true,
      slug: true,
      title: true,
      spot: true,
      content: true,
      coverImage: true,
    },
  });

  const job = await prisma.mediaGeneration.create({
    data: {
      articleId: article?.id ?? null,
      purpose: "VIDEO",
      status: "PROCESSING",
      prompt: article ? `Shorts video: ${article.title}` : `Shorts video: ${articleId}`,
      provider: "ffmpeg+polly",
      width: WIDTH,
      height: HEIGHT,
    },
  });

  async function fail(error: string) {
    await prisma.mediaGeneration.update({
      where: { id: job.id },
      data: { status: "FAILED", error, completedAt: new Date() },
    });
    return { jobId: job.id, status: "FAILED" as const, error };
  }

  if (!article) return fail("Makale bulunamadı");
  if (!article.coverImage) return fail("Makalenin kapak görseli yok");
  const ffmpeg = await resolveFfmpeg();
  if (!ffmpeg) return fail("ffmpeg bulunamadı (ffmpeg-static veya FFMPEG_BINARY_URL)");
  if (!isTtsConfigured()) return fail("Polly yapılandırılmamış (AWS kimlik bilgileri)");

  const workDir = await mkdtemp(path.join(tmpdir(), "sbs-video-"));
  try {
    // 1) Kapak görseli
    const imagePath = path.join(workDir, "cover.jpg");
    if (!(await downloadImage(article.coverImage, imagePath))) {
      return await fail("Kapak görseli indirilemedi");
    }

    // 2) Polly seslendirme
    const narration = buildNarration(article);
    const audio = await synthesizeSpeech(narration);
    if (!audio || audio.length === 0) return await fail("Seslendirme üretilemedi");
    const audioPath = path.join(workDir, "voice.mp3");
    await writeFile(audioPath, audio);

    const duration = Math.min(59, (await getAudioDuration(ffmpeg, audioPath)) + 0.8);
    const frames = Math.ceil(duration * FPS);

    // 3) Ken Burns + başlık bindirme filtresi
    // Görsel önce 9:16'ya kırpılır, sonra yavaş zoom uygulanır.
    // Bindirme ölçüleri 1080p referansından çözünürlüğe orantılanır.
    const s = WIDTH / 1080;
    const px = (v: number) => Math.round(v * s);
    const zoomStep = 0.20 / frames; // video boyunca ~%20 zoom
    let filter =
      `[0:v]scale=${WIDTH * 2}:${HEIGHT * 2}:force_original_aspect_ratio=increase,` +
      `crop=${WIDTH * 2}:${HEIGHT * 2},` +
      `zoompan=z='min(zoom+${zoomStep.toFixed(6)},1.2)':` +
      `x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${WIDTH}x${HEIGHT}:fps=${FPS},` +
      // Alt üçte birlik alana okunabilirlik için koyu degrade bant
      `drawbox=x=0:y=${HEIGHT - px(640)}:w=${WIDTH}:h=${px(640)}:color=black@0.55:t=fill,` +
      `drawbox=x=0:y=0:w=${WIDTH}:h=${px(140)}:color=black@0.45:t=fill`;

    const fontFile = await resolveFontFile();
    if (fontFile) {
      const font = fontFile.replace(/:/g, "\\:").replace(/'/g, "\\'");
      // Marka bandı
      filter +=
        `,drawtext=fontfile='${font}':text='SON BİR SÖZ':` +
        `fontcolor=white:fontsize=${px(44)}:x=(w-text_w)/2:y=${px(48)}`;
      // Başlık satırları (alt bölge)
      const lines = wrapText(article.title, 26, 4);
      const lineHeight = px(84);
      const baseY = HEIGHT - px(560);
      lines.forEach((line, i) => {
        filter +=
          `,drawtext=fontfile='${font}':text='${escapeDrawtext(line)}':` +
          `fontcolor=white:fontsize=${px(62)}:borderw=2:bordercolor=black@0.8:` +
          `x=(w-text_w)/2:y=${baseY + i * lineHeight}`;
      });
    }
    filter += `,format=yuv420p[v]`;

    const outputPath = path.join(workDir, "short.mp4");
    const args = [
      "-y",
      "-loop", "1",
      "-i", imagePath,
      "-i", audioPath,
      "-filter_complex", filter,
      "-map", "[v]",
      "-map", "1:a",
      "-c:v", "libx264",
      "-preset", X264_PRESET,
      "-crf", "23",
      "-c:a", "aac",
      "-b:a", "128k",
      "-t", duration.toFixed(2),
      "-movflags", "+faststart",
      outputPath,
    ];
    const { code, stderr } = await run(ffmpeg, args);
    if (code !== 0) {
      console.error("ffmpeg failed:", stderr.slice(-2000));
      return await fail("Video render başarısız (ffmpeg)");
    }

    // 4) S3'e yükle
    const videoBuffer = await readFile(outputPath);
    const key = `video/${article.slug}-${job.id.slice(-8)}.mp4`;
    const url = await uploadMediaObject(key, videoBuffer, "video/mp4");
    if (!url) return await fail("Video S3'e yüklenemedi");

    await prisma.mediaGeneration.update({
      where: { id: job.id },
      data: { status: "COMPLETED", resultUrl: url, completedAt: new Date() },
    });
    return { jobId: job.id, status: "COMPLETED", resultUrl: url };
  } catch (error) {
    console.error("generateArticleShort failed:", error);
    return await fail(error instanceof Error ? error.message : "Bilinmeyen hata");
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}
