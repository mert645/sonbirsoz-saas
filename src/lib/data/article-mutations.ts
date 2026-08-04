import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import slugify from "slugify";
import { revalidatePath } from "next/cache";
import { calculateReadingTime } from "@/lib/utils/format";
import { sendPushToAll } from "@/lib/push/push-sender";
import { publishArticleToSocial } from "@/lib/social/social-publisher";
import { pingIndexNow } from "@/lib/seo/indexnow";
import { sendBreakingEmailToSubscribers } from "@/lib/email/newsletter";
import { generateArticleAudio } from "@/lib/tts/polly";
import { upsertArticleEmbedding } from "@/lib/ai/embeddings";
import { isAuthBypassEnabled } from "@/lib/auth-guard";

export type SessionUser = {
  id?: string;
  role?: string;
  name?: string | null;
  email?: string | null;
};

/**
 * Returns the current admin session user, or null if not authenticated
 * with an editorial role. Use in API routes to guard mutations.
 *
 * When ADMIN_AUTH_DISABLED is set (demo/no-DB mode) a synthetic admin user
 * is returned so the panel is fully usable without a login. Bu bypass yalnızca
 * ÜRETİM DIŞINDA geçerlidir; NODE_ENV === "production" iken flag yok sayılır.
 */
export async function requireEditor(): Promise<SessionUser | null> {
  if (isAuthBypassEnabled()) {
    return {
      id: "demo-admin",
      role: "ADMIN",
      name: "Yönetici",
      email: "admin@sonbirsoz.com",
    };
  }
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  if (!user) return null;
  const allowed = ["ADMIN", "EDITOR", "AUTHOR"];
  if (!user.role || !allowed.includes(user.role)) return null;
  return user;
}

export function makeSlug(title: string): string {
  return slugify(title, { lower: true, strict: true, locale: "tr" });
}

/**
 * Ensures the current user has a linked Author record and returns its id.
 * Articles require both a userId (the account) and authorId (the byline).
 */
async function ensureAuthorId(user: SessionUser): Promise<string> {
  const email = user.email || undefined;
  const name = user.name || "Editör";

  if (email) {
    const existing = await prisma.author.findUnique({ where: { email } });
    if (existing) return existing.id;
  }

  const created = await prisma.author.create({
    data: {
      name,
      slug: makeSlug(name) || `yazar-${Date.now()}`,
      email: email || null,
    },
  });
  return created.id;
}

export interface CreateArticleInput {
  title: string;
  content: string;
  spot?: string;
  categoryId?: string;
  categorySlug?: string;
  coverImage?: string;
  status?: "DRAFT" | "REVIEW" | "PUBLISHED";
  isFeatured?: boolean;
  isBreaking?: boolean;
  seoTitle?: string;
  seoDescription?: string;
}

async function resolveCategoryId(input: CreateArticleInput): Promise<string> {
  if (input.categoryId) return input.categoryId;
  if (input.categorySlug) {
    const cat = await prisma.category.findUnique({
      where: { slug: input.categorySlug },
    });
    if (cat) return cat.id;
  }
  // Fall back to the first category (or create a default one).
  const first = await prisma.category.findFirst({ orderBy: { order: "asc" } });
  if (first) return first.id;
  const created = await prisma.category.create({
    data: { name: "Gündem", slug: "gundem", color: "#EF4444" },
  });
  return created.id;
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = base || `haber-${Date.now()}`;
  let n = 1;
  while (await prisma.article.findUnique({ where: { slug } })) {
    slug = `${base}-${n++}`;
  }
  return slug;
}

export async function createArticle(
  user: SessionUser,
  input: CreateArticleInput
) {
  const [authorId, categoryId] = await Promise.all([
    ensureAuthorId(user),
    resolveCategoryId(input),
  ]);

  const status = input.status || "DRAFT";
  const slug = await uniqueSlug(makeSlug(input.title));

  return prisma.article.create({
    data: {
      title: input.title,
      slug,
      spot: input.spot || null,
      content: input.content,
      coverImage: input.coverImage || null,
      categoryId,
      authorId,
      userId: user.id!,
      status,
      isFeatured: input.isFeatured ?? false,
      isBreaking: input.isBreaking ?? false,
      seoTitle: input.seoTitle || null,
      seoDescription: input.seoDescription || null,
      readingTime: calculateReadingTime(input.content),
      publishedAt: status === "PUBLISHED" ? new Date() : null,
    },
  });
}

export interface UpdateArticleInput {
  title?: string;
  content?: string;
  spot?: string;
  categoryId?: string;
  coverImage?: string;
  isFeatured?: boolean;
  isBreaking?: boolean;
  seoTitle?: string;
  seoDescription?: string;
}

export async function updateArticle(id: string, input: UpdateArticleInput) {
  const data: Record<string, unknown> = { ...input };
  if (input.content) data.readingTime = calculateReadingTime(input.content);
  return prisma.article.update({ where: { id }, data });
}

export async function setArticleStatus(
  id: string,
  status: "DRAFT" | "REVIEW" | "PUBLISHED" | "ARCHIVED" | "REJECTED",
  opts: { userId?: string; note?: string } = {}
) {
  const data: Record<string, unknown> = { status };
  if (status === "PUBLISHED") data.publishedAt = new Date();
  if (status === "REJECTED" && opts.note) data.rejectionNote = opts.note;

  const article = await prisma.article.update({ where: { id }, data });

  // When published, create scheduled social posts for each configured platform.
  if (status === "PUBLISHED") {
    // Yayınlanan içerik anında görünsün: ilgili ISR sayfalarını tazele.
    let articleUrl: string | null = null;
    try {
      const category = await prisma.category.findUnique({
        where: { id: article.categoryId },
        select: { slug: true },
      });
      revalidatePath("/");
      if (category) {
        revalidatePath(`/${category.slug}`);
        revalidatePath(`/${category.slug}/${article.slug}`);
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
        if (siteUrl) articleUrl = `${siteUrl}/${category.slug}/${article.slug}`;
      }
    } catch {
      // Revalidation is best-effort; never block publish.
    }

    // IndexNow: Bing/Yandex'e anında URL bildirimi (best-effort)
    if (articleUrl) {
      try {
        await pingIndexNow([articleUrl]);
      } catch {
        // never block publish
      }
    }

    // Moderasyondan geçen haber ANINDA sosyal medyaya gönderilir
    // (X/Telegram gecikmesiz; FB/IG/YT kademeli zamanlanır, cron yedek).
    try {
      await publishArticleToSocial(id);
    } catch {
      // Social publish is best-effort; never block publish.
    }

    // Polly ile sesli özet üret ("Bu haberi dinle") — best-effort
    if (!article.audioUrl) {
      try {
        await generateArticleAudio(id);
      } catch {
        // TTS is best-effort; never block publish.
      }
    }

    // RAG AI arama için embedding üret/güncelle — best-effort
    try {
      await upsertArticleEmbedding(id);
    } catch {
      // Embedding is best-effort; never block publish.
    }

    // Send web push notification to subscribers.
    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
      const category = await prisma.category.findUnique({
        where: { id: article.categoryId },
        select: { slug: true },
      });
      const url = category
        ? `${siteUrl}/${category.slug}/${article.slug}`
        : `${siteUrl}`;
      await sendPushToAll({
        title: article.title,
        body: article.spot || "Son Bir Söz'de yeni haber yayınlandı.",
        url,
        icon: `${siteUrl}/icons/icon-192.png`,
      });

      // Son dakika haberi: abonelere anlık e-posta (best-effort)
      if (article.isBreaking && category) {
        await sendBreakingEmailToSubscribers({
          title: article.title,
          spot: article.spot,
          slug: article.slug,
          categorySlug: category.slug,
        });
      }
    } catch {
      // Push is best-effort; never block publish.
    }
  }

  // Best-effort editorial audit trail.
  if (opts.userId) {
    try {
      await prisma.editorialAction.create({
        data: {
          articleId: id,
          userId: opts.userId,
          action: status,
          note: opts.note || null,
        },
      });
    } catch {
      // Audit is optional; ignore if the schema/relation isn't ready.
    }
  }

  return article;
}

export async function deleteArticle(id: string) {
  return prisma.article.delete({ where: { id } });
}
