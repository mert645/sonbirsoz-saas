import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { prisma } from "@/lib/db";
import { htmlToPlainText } from "@/lib/tts/polly";

/**
 * RAG AI arama için embedding katmanı.
 * Titan Embed Text v2 (512 boyut, normalize) + pgvector cosine benzerliği.
 * Best-effort: yapılandırma yoksa veya hata olursa boş sonuç döner.
 */

const EMBED_MODEL = "amazon.titan-embed-text-v2:0";
export const EMBED_DIMENSIONS = 512;
// Embedding girdisi: başlık + spot + içerik girişi (Titan limiti ~8k token)
const MAX_INPUT_CHARS = 6000;

let client: BedrockRuntimeClient | null = null;

function getClient(): BedrockRuntimeClient | null {
  const accessKeyId =
    process.env.CUSTOM_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey =
    process.env.CUSTOM_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) return null;

  if (!client) {
    client = new BedrockRuntimeClient({
      region:
        process.env.CUSTOM_AWS_REGION || process.env.AWS_REGION || "eu-central-1",
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return client;
}

export function isEmbeddingConfigured(): boolean {
  return !!getClient();
}

/** Metni 512 boyutlu normalize vektöre çevirir. */
export async function embedText(text: string): Promise<number[] | null> {
  const bedrock = getClient();
  if (!bedrock) return null;

  try {
    const res = await bedrock.send(
      new InvokeModelCommand({
        modelId: EMBED_MODEL,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify({
          inputText: text.slice(0, MAX_INPUT_CHARS),
          dimensions: EMBED_DIMENSIONS,
          normalize: true,
        }),
      })
    );
    const body = JSON.parse(new TextDecoder().decode(res.body));
    return Array.isArray(body.embedding) ? (body.embedding as number[]) : null;
  } catch (error) {
    console.error("Embedding failed:", error);
    return null;
  }
}

function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

/** Makale embedding'ini üretir ve pgvector tablosuna upsert eder. */
export async function upsertArticleEmbedding(articleId: string): Promise<boolean> {
  try {
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      select: { title: true, spot: true, content: true },
    });
    if (!article) return false;

    const text = [article.title, article.spot ?? "", htmlToPlainText(article.content)]
      .filter(Boolean)
      .join("\n");

    const embedding = await embedText(text);
    if (!embedding) return false;

    const vector = toVectorLiteral(embedding);
    await prisma.$executeRawUnsafe(
      `INSERT INTO "article_embeddings" ("articleId", "embedding", "updatedAt")
       VALUES ($1, $2::vector, NOW())
       ON CONFLICT ("articleId")
       DO UPDATE SET "embedding" = $2::vector, "updatedAt" = NOW()`,
      articleId,
      vector
    );
    return true;
  } catch (error) {
    console.error("upsertArticleEmbedding failed:", error);
    return false;
  }
}

export interface SemanticHit {
  id: string;
  title: string;
  spot: string | null;
  slug: string;
  categorySlug: string;
  categoryName: string;
  publishedAt: Date | null;
  similarity: number;
}

/** Sorguya en yakın yayınlanmış makaleleri cosine benzerliğiyle getirir. */
export async function semanticSearch(
  query: string,
  limit = 6
): Promise<SemanticHit[]> {
  const embedding = await embedText(query);
  if (!embedding) return [];

  try {
    const vector = toVectorLiteral(embedding);
    const rows = await prisma.$queryRawUnsafe<
      {
        id: string;
        title: string;
        spot: string | null;
        slug: string;
        categorySlug: string;
        categoryName: string;
        publishedAt: Date | null;
        similarity: number;
      }[]
    >(
      `SELECT a."id", a."title", a."spot", a."slug",
              c."slug" AS "categorySlug", c."name" AS "categoryName",
              a."publishedAt",
              1 - (e."embedding" <=> $1::vector) AS "similarity"
       FROM "article_embeddings" e
       JOIN "articles" a ON a."id" = e."articleId"
       JOIN "categories" c ON c."id" = a."categoryId"
       WHERE a."status" = 'PUBLISHED'
       ORDER BY e."embedding" <=> $1::vector
       LIMIT $2`,
      vector,
      limit
    );
    return rows;
  } catch (error) {
    console.error("semanticSearch failed:", error);
    return [];
  }
}
