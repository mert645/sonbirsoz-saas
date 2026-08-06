/**
 * GDPR Compliance Utilities
 * Veri export, silme ve anonimleştirme işlemleri
 */

import { prisma } from "@/lib/db";

export interface UserDataExport {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    createdAt: Date;
    lastLoginAt: Date | null;
  };
  tenantMemberships: Array<{
    tenantName: string;
    role: string;
    joinedAt: Date;
  }>;
  articles: Array<{
    id: string;
    title: string;
    status: string;
    createdAt: Date;
    publishedAt: Date | null;
  }>;
  comments: Array<{
    id: string;
    content: string;
    articleTitle: string;
    createdAt: Date;
  }>;
  auditLogs: Array<{
    action: string;
    createdAt: Date;
    ipAddress: string | null;
  }>;
  exportedAt: Date;
}

/**
 * Kullanıcının tüm verilerini export eder (GDPR Madde 20 - Veri Taşınabilirliği)
 */
export async function exportUserData(userId: string): Promise<UserDataExport> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });

  if (!user) {
    throw new Error("Kullanıcı bulunamadı");
  }

  // Tenant üyelikleri
  const tenantMemberships = await prisma.tenantUser.findMany({
    where: { userId },
    include: {
      tenant: { select: { name: true } },
    },
  });

  // Makaleler
  const articles = await prisma.article.findMany({
    where: { userId },
    select: {
      id: true,
      title: true,
      status: true,
      createdAt: true,
      publishedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Yorumlar
  const comments = await prisma.comment.findMany({
    where: { userId },
    include: {
      article: { select: { title: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Audit logları (son 1 yıl)
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const auditLogs = await prisma.auditLog.findMany({
    where: {
      userId,
      createdAt: { gte: oneYearAgo },
    },
    select: {
      action: true,
      createdAt: true,
      ipAddress: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return {
    user,
    tenantMemberships: tenantMemberships.map((tm) => ({
      tenantName: tm.tenant.name,
      role: tm.role,
      joinedAt: tm.createdAt,
    })),
    articles: articles.map((a) => ({
      id: a.id,
      title: a.title,
      status: a.status,
      createdAt: a.createdAt,
      publishedAt: a.publishedAt,
    })),
    comments: comments.map((c) => ({
      id: c.id,
      content: c.content,
      articleTitle: c.article.title,
      createdAt: c.createdAt,
    })),
    auditLogs: auditLogs.map((al) => ({
      action: al.action,
      createdAt: al.createdAt,
      ipAddress: al.ipAddress,
    })),
    exportedAt: new Date(),
  };
}

/**
 * Tenant'ın tüm verilerini export eder
 */
export async function exportTenantData(tenantId: string): Promise<{
  tenant: object;
  users: object[];
  articles: object[];
  categories: object[];
  authors: object[];
  media: object[];
  comments: object[];
  exportedAt: Date;
}> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      settings: true,
      subscription: true,
    },
  });

  if (!tenant) {
    throw new Error("Tenant bulunamadı");
  }

  const [users, articles, categories, authors, media, comments] = await Promise.all([
    prisma.tenantUser.findMany({
      where: { tenantId },
      include: { user: { select: { email: true, name: true } } },
    }),
    prisma.article.findMany({
      where: { tenantId },
      select: {
        id: true,
        title: true,
        slug: true,
        content: true,
        status: true,
        createdAt: true,
        publishedAt: true,
      },
    }),
    prisma.category.findMany({
      where: { tenantId },
      select: { id: true, name: true, slug: true, description: true },
    }),
    prisma.author.findMany({
      where: { tenantId },
      select: { id: true, name: true, slug: true, email: true, bio: true },
    }),
    prisma.media.findMany({
      where: { tenantId },
      select: { id: true, filename: true, url: true, type: true, createdAt: true },
    }),
    prisma.comment.findMany({
      where: { tenantId },
      select: { id: true, content: true, authorName: true, createdAt: true },
    }),
  ]);

  return {
    tenant: {
      name: tenant.name,
      slug: tenant.slug,
      domain: tenant.domain,
      plan: tenant.plan,
      createdAt: tenant.createdAt,
      settings: tenant.settings,
    },
    users: users.map((u) => ({
      email: u.user.email,
      name: u.user.name,
      role: u.role,
      joinedAt: u.createdAt,
    })),
    articles,
    categories,
    authors,
    media,
    comments,
    exportedAt: new Date(),
  };
}

/**
 * Kullanıcı verilerini anonimleştirir (GDPR Madde 17 - Unutulma Hakkı)
 * Kullanıcıyı silmek yerine verilerini anonimleştirir
 */
export async function anonymizeUser(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("Kullanıcı bulunamadı");
  }

  const anonymizedEmail = `deleted_${userId.slice(0, 8)}@anonymized.local`;
  const anonymizedName = "Silinmiş Kullanıcı";

  await prisma.$transaction([
    // Kullanıcı bilgilerini anonimleştir
    prisma.user.update({
      where: { id: userId },
      data: {
        email: anonymizedEmail,
        name: anonymizedName,
        passwordHash: null,
        image: null,
        emailVerified: null,
        lastLoginAt: null,
        lastLoginIp: null,
      },
    }),

    // Yorumlardaki kullanıcı bilgilerini anonimleştir
    prisma.comment.updateMany({
      where: { userId },
      data: {
        authorName: anonymizedName,
        authorEmail: anonymizedEmail,
      },
    }),

    // Audit loglarındaki email'i anonimleştir
    prisma.auditLog.updateMany({
      where: { userId },
      data: {
        userEmail: anonymizedEmail,
        ipAddress: null,
        userAgent: null,
      },
    }),

    // Şifre geçmişini sil
    prisma.passwordHistory.deleteMany({
      where: { userId },
    }),

    // Session'ları sil
    prisma.session.deleteMany({
      where: { userId },
    }),

    // Account bağlantılarını sil
    prisma.account.deleteMany({
      where: { userId },
    }),
  ]);
}

/**
 * Kullanıcıyı ve tüm verilerini tamamen siler (Hard Delete)
 * DİKKAT: Bu işlem geri alınamaz!
 */
export async function deleteUserCompletely(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      tenants: true,
    },
  });

  if (!user) {
    throw new Error("Kullanıcı bulunamadı");
  }

  // OWNER rolündeki tenant'ları kontrol et
  const ownedTenants = user.tenants.filter((t) => t.role === "OWNER");
  if (ownedTenants.length > 0) {
    throw new Error(
      "Bu kullanıcı bir veya daha fazla tenant'ın sahibi. Önce sahipliği devredin."
    );
  }

  await prisma.$transaction([
    // Şifre geçmişi
    prisma.passwordHistory.deleteMany({ where: { userId } }),
    
    // Audit logları (userId null yapılır, silinmez)
    prisma.auditLog.updateMany({
      where: { userId },
      data: { userId: null, userEmail: "[DELETED]" },
    }),
    
    // Session'lar
    prisma.session.deleteMany({ where: { userId } }),
    
    // Account bağlantıları
    prisma.account.deleteMany({ where: { userId } }),
    
    // Tenant üyelikleri
    prisma.tenantUser.deleteMany({ where: { userId } }),
    
    // Editorial actions
    prisma.editorialAction.deleteMany({ where: { userId } }),
    
    // Yorumlar (anonimleştir)
    prisma.comment.updateMany({
      where: { userId },
      data: { userId: null, authorName: "[Silinmiş Kullanıcı]" },
    }),
    
    // Makaleler (userId null yapılır)
    prisma.article.updateMany({
      where: { userId },
      data: { userId: null },
    }),
    
    // Kullanıcıyı sil
    prisma.user.delete({ where: { id: userId } }),
  ]);
}

/**
 * Tenant'ı ve tüm verilerini siler
 * DİKKAT: Bu işlem geri alınamaz!
 */
export async function deleteTenantCompletely(tenantId: string): Promise<void> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    throw new Error("Tenant bulunamadı");
  }

  // Cascade delete ile tüm ilişkili veriler silinir
  // Prisma schema'da onDelete: Cascade tanımlı
  await prisma.tenant.delete({
    where: { id: tenantId },
  });
}

/**
 * Veri saklama süresi dolan kayıtları temizler
 * GDPR Madde 5(1)(e) - Depolama Sınırlaması
 */
export async function cleanupExpiredData(): Promise<{
  deletedAuditLogs: number;
  deletedSessions: number;
  deletedInvitations: number;
}> {
  const now = new Date();
  
  // 2 yıldan eski audit logları sil
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  
  const deletedAuditLogs = await prisma.auditLog.deleteMany({
    where: {
      createdAt: { lt: twoYearsAgo },
    },
  });

  // Süresi dolmuş session'ları sil
  const deletedSessions = await prisma.session.deleteMany({
    where: {
      expires: { lt: now },
    },
  });

  // Süresi dolmuş davetleri sil
  const deletedInvitations = await prisma.tenantInvitation.deleteMany({
    where: {
      expiresAt: { lt: now },
      status: "PENDING",
    },
  });

  return {
    deletedAuditLogs: deletedAuditLogs.count,
    deletedSessions: deletedSessions.count,
    deletedInvitations: deletedInvitations.count,
  };
}

/**
 * Kullanıcının rıza durumunu günceller
 */
export async function updateConsent(
  userId: string,
  consents: {
    marketing?: boolean;
    analytics?: boolean;
    thirdParty?: boolean;
  }
): Promise<void> {
  // Not: Consent bilgisi için ayrı bir model eklenebilir
  // Şimdilik audit log'a kaydediyoruz
  await prisma.auditLog.create({
    data: {
      action: "CONSENT_UPDATE",
      severity: "INFO",
      userId,
      details: consents,
      success: true,
    },
  });
}
