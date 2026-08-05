import { TenantPlan } from "@/generated/prisma/client";

export type UsageMetric = "ARTICLES" | "STORAGE_MB" | "AI_TOKENS" | "USERS";

export interface PlanLimits {
  users: number;
  articlesPerMonth: number;
  storageMB: number;
  aiTokensPerMonth: number;
  features: {
    aiGeneration: boolean;
    aiModeration: boolean;
    videoStudio: boolean;
    newsletter: boolean;
    pushNotifications: boolean;
    customDomain: boolean;
    apiAccess: boolean;
    prioritySupport: boolean;
  };
}

export const PLAN_LIMITS: Record<TenantPlan, PlanLimits> = {
  STARTER: {
    users: 1,
    articlesPerMonth: 500,
    storageMB: 5 * 1024, // 5 GB
    aiTokensPerMonth: 0,
    features: {
      aiGeneration: false,
      aiModeration: false,
      videoStudio: false,
      newsletter: true,
      pushNotifications: true,
      customDomain: false,
      apiAccess: false,
      prioritySupport: false,
    },
  },
  PROFESSIONAL: {
    users: 5,
    articlesPerMonth: 2000,
    storageMB: 25 * 1024, // 25 GB
    aiTokensPerMonth: 100000,
    features: {
      aiGeneration: true,
      aiModeration: true,
      videoStudio: true,
      newsletter: true,
      pushNotifications: true,
      customDomain: false,
      apiAccess: false,
      prioritySupport: true,
    },
  },
  ENTERPRISE: {
    users: -1, // Sınırsız
    articlesPerMonth: -1, // Sınırsız
    storageMB: 100 * 1024, // 100 GB
    aiTokensPerMonth: -1, // Sınırsız
    features: {
      aiGeneration: true,
      aiModeration: true,
      videoStudio: true,
      newsletter: true,
      pushNotifications: true,
      customDomain: true,
      apiAccess: true,
      prioritySupport: true,
    },
  },
};

export interface PlanPricing {
  monthly: number;
  yearly: number;
  currency: string;
}

export const PLAN_PRICING: Record<TenantPlan, PlanPricing> = {
  STARTER: {
    monthly: 499,
    yearly: 4990, // ~2 ay ücretsiz
    currency: "TRY",
  },
  PROFESSIONAL: {
    monthly: 1499,
    yearly: 14990,
    currency: "TRY",
  },
  ENTERPRISE: {
    monthly: 0, // Özel fiyatlandırma
    yearly: 0,
    currency: "TRY",
  },
};

export const PLAN_NAMES: Record<TenantPlan, string> = {
  STARTER: "Starter",
  PROFESSIONAL: "Professional",
  ENTERPRISE: "Enterprise",
};

export const PLAN_DESCRIPTIONS: Record<TenantPlan, string> = {
  STARTER: "Küçük ekipler ve bireysel kullanıcılar için ideal başlangıç planı",
  PROFESSIONAL: "Büyüyen ekipler için AI destekli gelişmiş özellikler",
  ENTERPRISE: "Kurumsal ihtiyaçlar için özelleştirilmiş çözümler",
};
