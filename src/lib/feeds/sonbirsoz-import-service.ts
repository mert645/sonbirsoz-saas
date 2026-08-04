import type { PrismaClient } from "@/generated/prisma/client";
import {
  fetchSonbirsozArticles,
  fetchSonbirsozArchiveUrls,
  fetchSonbirsozArticlesByUrls,
  estimateReadingTime,
  type ImportOptions,
  type ImportedArticle,
  type ArchiveUrlOptions,
} from "./sonbirsoz-importer";
import { quickFlag, moderateAndLog } from "@/lib/ai/moderation";

export interface ImportResult {
  fetched: number;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

// Slug'a göre kategoriyi bul; yoksa oluştur.
async function ensureCategory(
  prisma: PrismaClient,
  slug: string,
  cache: Map<string, string>,
): Promise<string> {
  const cached = cache.get(slug);
  if (cached) return cached;

  const NAMES: Record<string, string> = {
    gundem: "Gündem",
    politika: "Politika",
    spor: "Spor",
    magazin: "Magazin",
    saglik: "Sağlık",
    yasam: "Yaşam",
    dunya: "Dünya",
    ekonomi: "Ekonomi",
    teknoloji: "Teknoloji",
    kultur: "Kültür & Sanat",
  };

  const existing = await prisma.category.findUnique({ where: { slug } });
  if (existing) {
    cache.set(slug, existing.id);
    return existing.id;
  }
  const created = await prisma.category.create({
    data: { name: NAMES[slug] || slug, slug, isActive: true },
  });
  cache.set(slug, created.id);
  return created.id;
}

// "Son Bir Söz" editör yazarını bul/oluştur (kaynak site adına atıf).
async function ensureSourceAuthor(prisma: PrismaClient): Promise<string> {
  const slug = "son-bir-soz";
  const existing = await prisma.author.findUnique({ where: { slug } });
  if (existing) return existing.id;
  const created = await prisma.author.create({
    data: {
      name: "Son Bir Söz",
      slug,
      bio: "SonBirSöz.com haber merkezi.",
      isActive: true,
    },
  });
  return created.id;
}

/**
 * Tek bir ImportedArticle'ı DB'ye yazar (upsert). result sayaçlarını günceller.
 */
async function persistArticle(
  prisma: PrismaClient,
  a: ImportedArticle,
  ctx: {
    userId: string;
    authorId: string;
    catCache: Map<string, string>;
    result: ImportResult;
  },
): Promise<void> {
  const { userId, authorId, catCache, result } = ctx;
  try {
    const categoryId = await ensureCategory(prisma, a.categorySlug, catCache);

    // Var olan mı? Önce sourceUrl, sonra slug.
    const existing =
      (await prisma.article.findFirst({ where: { sourceUrl: a.sourceUrl } })) ||
      (await prisma.article.findUnique({ where: { slug: a.slug } }));

    const data = {
      title: a.title,
      spot: a.spot,
      content: a.content,
      coverImage: a.coverImage,
      coverImageAlt: a.coverImageAlt,
      categoryId,
      seoTitle: a.title.slice(0, 60),
      seoDescription: a.spot?.slice(0, 160) ?? null,
      readingTime: estimateReadingTime(a.content),
      sourceUrl: a.sourceUrl,
      publishedAt: a.publishedAt,
    };

    if (existing) {
      await prisma.article.update({ where: { id: existing.id }, data });
      result.updated++;
    } else {
      // Kaynak kendi canlı sitemiz (editoryal onaylı) — ucuz yerel filtre;
      // yalnızca şüpheli kalıp bulunursa tam AI moderasyonu devreye girer.
      let status: "PUBLISHED" | "REVIEW" = "PUBLISHED";
      let moderationLogId: string | null = null;
      if (quickFlag(`${a.title} ${a.content}`)) {
        const moderation = await moderateAndLog({
          title: a.title,
          text: a.content,
          contentType: "article",
          source: "import",
        });
        if (moderation.decision !== "APPROVED") {
          status = "REVIEW";
          moderationLogId = moderation.logId;
        }
      }

      const created = await prisma.article.create({
        data: {
          ...data,
          slug: a.slug,
          authorId,
          userId,
          status,
          isAIGenerated: false,
        },
      });
      // İnceleme kuyruğuna düşen içeriğin logunu makaleye bağla
      if (moderationLogId) {
        await prisma.moderationLog.update({
          where: { id: moderationLogId },
          data: { articleId: created.id },
        });
      }
      result.created++;
    }
  } catch (err) {
    result.skipped++;
    const msg = err instanceof Error ? err.message : String(err);
    if (result.errors.length < 10) {
      result.errors.push(`${a.slug}: ${msg.slice(0, 120)}`);
    }
  }
}

// Yazma sahibi kullanıcıyı çöz (verilen userId ya da ilk admin/editör).
async function resolveUserId(
  prisma: PrismaClient,
  userId: string | undefined,
): Promise<string | null> {
  if (userId) return userId;
  const admin = await prisma.user.findFirst({
    where: { role: { in: ["ADMIN", "EDITOR"] } },
    orderBy: { createdAt: "asc" },
  });
  return admin?.id ?? null;
}

/**
 * sonbirsoz.com'daki güncel haberleri çekip DB'ye PUBLISHED Article olarak yazar.
 * Var olan haberler (sourceUrl veya slug eşleşmesi) güncellenir, yenileri eklenir.
 */
export async function importSonbirsozArticles(
  prisma: PrismaClient,
  opts: ImportOptions & { userId?: string } = {},
): Promise<ImportResult> {
  const result: ImportResult = {
    fetched: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  const userId = await resolveUserId(prisma, opts.userId);
  if (!userId) {
    result.errors.push("Yazma için ADMIN/EDITOR kullanıcı bulunamadı.");
    return result;
  }

  const authorId = await ensureSourceAuthor(prisma);
  const catCache = new Map<string, string>();

  const articles: ImportedArticle[] = await fetchSonbirsozArticles(opts);
  result.fetched = articles.length;

  for (const a of articles) {
    await persistArticle(prisma, a, { userId, authorId, catCache, result });
  }

  return result;
}

export interface ArchiveImportOptions extends ArchiveUrlOptions {
  userId?: string;
  /** Zenginleştirme eşzamanlılığı (varsayılan 8). */
  concurrency?: number;
  /** Kaç URL'lik gruplar hâlinde işlenip DB'ye yazılacağı (varsayılan 200). */
  batchSize?: number;
  /** İlerleme geri bildirimi. */
  onBatch?: (info: {
    batch: number;
    totalBatches: number;
    result: ImportResult;
  }) => void;
}

/**
 * sonbirsoz.com'un TÜM arşivini (aylık sitemap'ler) DB'ye aktarır.
 * URL'ler önce toplanır, sonra batch batch zenginleştirilip yazılır — böylece
 * bellek/bağlantı yükü sınırlı kalır ve kesinti durumunda tekrar çalıştırıldığında
 * var olanlar güncellenir (idempotent).
 */
export async function importSonbirsozArchive(
  prisma: PrismaClient,
  opts: ArchiveImportOptions = {},
): Promise<ImportResult & { totalUrls: number }> {
  const result: ImportResult = {
    fetched: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  const userId = await resolveUserId(prisma, opts.userId);
  if (!userId) {
    result.errors.push("Yazma için ADMIN/EDITOR kullanıcı bulunamadı.");
    return { ...result, totalUrls: 0 };
  }
  const authorId = await ensureSourceAuthor(prisma);
  const catCache = new Map<string, string>();

  const urls = await fetchSonbirsozArchiveUrls({
    since: opts.since,
    max: opts.max,
  });
  const batchSize = opts.batchSize ?? 200;
  const totalBatches = Math.ceil(urls.length / batchSize) || 1;

  for (let b = 0; b < totalBatches; b++) {
    const slice = urls.slice(b * batchSize, (b + 1) * batchSize);
    const articles = await fetchSonbirsozArticlesByUrls(slice, {
      concurrency: opts.concurrency ?? 8,
    });
    result.fetched += articles.length;
    for (const a of articles) {
      await persistArticle(prisma, a, { userId, authorId, catCache, result });
    }
    opts.onBatch?.({ batch: b + 1, totalBatches, result });
  }

  return { ...result, totalUrls: urls.length };
}

/**
 * Verilen makale URL'lerini (eksik arşiv denetiminden gelen) içe aktarır.
 * archive-audit script'i tarafından kullanılır — yalnızca eksikler çekilir,
 * var olan 24K+ makale yeniden işlenmez.
 */
export async function importSonbirsozByUrls(
  prisma: PrismaClient,
  urls: string[],
  opts: { userId?: string; concurrency?: number; batchSize?: number } = {},
): Promise<ImportResult> {
  const result: ImportResult = {
    fetched: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };
  if (urls.length === 0) return result;

  const userId = await resolveUserId(prisma, opts.userId);
  if (!userId) {
    result.errors.push("Yazma için ADMIN/EDITOR kullanıcı bulunamadı.");
    return result;
  }
  const authorId = await ensureSourceAuthor(prisma);
  const catCache = new Map<string, string>();

  const batchSize = opts.batchSize ?? 200;
  for (let i = 0; i < urls.length; i += batchSize) {
    const slice = urls.slice(i, i + batchSize);
    const articles = await fetchSonbirsozArticlesByUrls(slice, {
      concurrency: opts.concurrency ?? 8,
    });
    result.fetched += articles.length;
    for (const a of articles) {
      await persistArticle(prisma, a, { userId, authorId, catCache, result });
    }
  }
  return result;
}
