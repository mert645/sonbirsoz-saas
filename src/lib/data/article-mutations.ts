import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import slugify from "slugify";
import { revalidatePath } from "next/cache";
import { calculateReadingTime } from "@/lib/utils/format";
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
  const allowed = ["ADMIN", "EDITOR", "AUTHOR", "SUPER_ADMIN"];
  if (!user.role || !allowed.includes(user.role)) return null;
  return user;
}

export function makeSlug(title: string): string {
  return slugify(title, { lower: true, strict: true, locale: "tr" });
}

/**
 * Ensures the current user has a linked Author record and returns its id.
 * Multi-tenant: tenantId zorunlu.
 */
async function ensureAuthorId(user: SessionUser, tenantId: string): Promise<string> {
  const email = user.email || undefined;
  const name = user.name || "Editör";

  if (email) {
    const existing = await prisma.author.findFirst({ 
      where: { tenantId, email } 
    });
    if (existing) return existing.id;
  }

  const created = await prisma.author.create({
    data: {
      tenantId,
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
  tenantId: string; // Multi-tenant zorunlu
}

async function resolveCategoryId(input: CreateArticleInput): Promise<string> {
  if (input.categoryId) return input.categoryId;
  if (input.categorySlug) {
    const cat = await prisma.category.findFirst({
      where: { tenantId: input.tenantId, slug: input.categorySlug },
    });
    if (cat) return cat.id;
  }
  // Fall back to the first category (or create a default one).
  const first = await prisma.category.findFirst({ 
    where: { tenantId: input.tenantId },
    orderBy: { order: "asc" } 
  });
  if (first) return first.id;
  const created = await prisma.category.create({
    data: { tenantId: input.tenantId, name: "Gündem", slug: "gundem", color: "#EF4444" },
  });
  return created.id;
}

async function uniqueSlug(base: string, tenantId: string): Promise<string> {
  let slug = base || `haber-${Date.now()}`;
  let n = 1;
  while (await prisma.article.findFirst({ where: { tenantId, slug } })) {
    slug = `${base}-${n++}`;
  }
  return slug;
}

export async function createArticle(
  user: SessionUser,
  input: CreateArticleInput
) {
  const [authorId, categoryId] = await Promise.all([
    ensureAuthorId(user, input.tenantId),
    resolveCategoryId(input),
  ]);

  const status = input.status || "DRAFT";
  const slug = await uniqueSlug(makeSlug(input.title), input.tenantId);

  return prisma.article.create({
    data: {
      tenantId: input.tenantId,
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

  // When published, revalidate pages
  if (status === "PUBLISHED") {
    try {
      const category = await prisma.category.findUnique({
        where: { id: article.categoryId },
        select: { slug: true },
      });
      revalidatePath("/");
      if (category) {
        revalidatePath(`/${category.slug}`);
        revalidatePath(`/${category.slug}/${article.slug}`);
      }
    } catch {
      // Revalidation is best-effort; never block publish.
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
