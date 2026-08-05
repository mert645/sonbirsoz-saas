import { prisma } from "@/lib/db";
import { PLAN_LIMITS, UsageMetric } from "./plans";
import { TenantPlan } from "@/generated/prisma/client";

export interface UsageCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  percentage: number;
}

export async function getCurrentPeriodStart(): Promise<Date> {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export async function getUsage(
  tenantId: string,
  metric: UsageMetric
): Promise<number> {
  const periodStart = await getCurrentPeriodStart();

  const record = await prisma.usageRecord.findUnique({
    where: {
      tenantId_metric_period: {
        tenantId,
        metric,
        period: periodStart,
      },
    },
  });

  return record?.value ?? 0;
}

export async function incrementUsage(
  tenantId: string,
  metric: UsageMetric,
  amount: number = 1
): Promise<number> {
  const periodStart = await getCurrentPeriodStart();

  const record = await prisma.usageRecord.upsert({
    where: {
      tenantId_metric_period: {
        tenantId,
        metric,
        period: periodStart,
      },
    },
    update: {
      value: { increment: amount },
    },
    create: {
      tenantId,
      metric,
      period: periodStart,
      value: amount,
    },
  });

  return record.value;
}

export async function checkUsageLimit(
  tenantId: string,
  metric: UsageMetric
): Promise<UsageCheckResult> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { plan: true },
  });

  if (!tenant) {
    return { allowed: false, current: 0, limit: 0, percentage: 100 };
  }

  const limits = PLAN_LIMITS[tenant.plan as TenantPlan];
  const current = await getUsage(tenantId, metric);

  let limit: number;
  switch (metric) {
    case "ARTICLES":
      limit = limits.articlesPerMonth;
      break;
    case "STORAGE_MB":
      limit = limits.storageMB;
      break;
    case "AI_TOKENS":
      limit = limits.aiTokensPerMonth;
      break;
    case "USERS":
      limit = limits.users;
      break;
    default:
      limit = 0;
  }

  // -1 = sınırsız
  if (limit === -1) {
    return { allowed: true, current, limit: -1, percentage: 0 };
  }

  const percentage = limit > 0 ? Math.round((current / limit) * 100) : 100;

  return {
    allowed: current < limit,
    current,
    limit,
    percentage: Math.min(percentage, 100),
  };
}

export async function checkFeatureAccess(
  tenantId: string,
  feature: keyof typeof PLAN_LIMITS.STARTER.features
): Promise<boolean> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { plan: true },
  });

  if (!tenant) return false;

  const limits = PLAN_LIMITS[tenant.plan as TenantPlan];
  return limits.features[feature];
}

export async function getTenantUsageSummary(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { plan: true },
  });

  if (!tenant) return null;

  const limits = PLAN_LIMITS[tenant.plan as TenantPlan];
  const periodStart = await getCurrentPeriodStart();

  const [articles, storage, aiTokens, userCount] = await Promise.all([
    getUsage(tenantId, "ARTICLES"),
    getUsage(tenantId, "STORAGE_MB"),
    getUsage(tenantId, "AI_TOKENS"),
    prisma.tenantUser.count({ where: { tenantId } }),
  ]);

  return {
    plan: tenant.plan,
    period: periodStart,
    usage: {
      articles: {
        current: articles,
        limit: limits.articlesPerMonth,
        percentage:
          limits.articlesPerMonth === -1
            ? 0
            : Math.round((articles / limits.articlesPerMonth) * 100),
      },
      storage: {
        current: storage,
        limit: limits.storageMB,
        percentage:
          limits.storageMB === -1
            ? 0
            : Math.round((storage / limits.storageMB) * 100),
      },
      aiTokens: {
        current: aiTokens,
        limit: limits.aiTokensPerMonth,
        percentage:
          limits.aiTokensPerMonth === -1
            ? 0
            : Math.round((aiTokens / limits.aiTokensPerMonth) * 100),
      },
      users: {
        current: userCount,
        limit: limits.users,
        percentage:
          limits.users === -1 ? 0 : Math.round((userCount / limits.users) * 100),
      },
    },
    features: limits.features,
  };
}

export async function getAllTenantsUsage() {
  const tenants = await prisma.tenant.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      plan: true,
      isActive: true,
      subscription: true,
      _count: {
        select: {
          articles: true,
          users: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const periodStart = await getCurrentPeriodStart();

  const usageRecords = await prisma.usageRecord.findMany({
    where: {
      period: periodStart,
      tenantId: { in: tenants.map((t) => t.id) },
    },
  });

  const usageMap = new Map<string, Record<string, number>>();
  for (const record of usageRecords) {
    if (!usageMap.has(record.tenantId)) {
      usageMap.set(record.tenantId, {});
    }
    usageMap.get(record.tenantId)![record.metric] = record.value;
  }

  return tenants.map((tenant) => {
    const limits = PLAN_LIMITS[tenant.plan as TenantPlan];
    const usage = usageMap.get(tenant.id) || {};

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      plan: tenant.plan,
      isActive: tenant.isActive,
      subscription: tenant.subscription,
      usage: {
        articles: usage.ARTICLES || 0,
        articlesLimit: limits.articlesPerMonth,
        storage: usage.STORAGE_MB || 0,
        storageLimit: limits.storageMB,
        aiTokens: usage.AI_TOKENS || 0,
        aiTokensLimit: limits.aiTokensPerMonth,
        users: tenant._count.users,
        usersLimit: limits.users,
      },
    };
  });
}
