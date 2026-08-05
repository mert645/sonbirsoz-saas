"use client";

import { useState, useEffect } from "react";
import {
  CreditCard,
  Check,
  X,
  AlertCircle,
  TrendingUp,
  FileText,
  Users,
  HardDrive,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface UsageItem {
  current: number;
  limit: number;
  percentage: number;
}

interface BillingData {
  tenant: {
    id: string;
    name: string;
    slug: string;
    plan: string;
  };
  subscription: {
    status: string;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    trialEndsAt: string | null;
  } | null;
  currentPlan: {
    id: string;
    name: string;
    description: string;
    pricing: {
      monthly: number;
      yearly: number;
      currency: string;
    };
  };
  availablePlans: Array<{
    id: string;
    name: string;
    description: string;
    pricing: {
      monthly: number;
      yearly: number;
      currency: string;
    };
    isCurrent: boolean;
  }>;
  usage: {
    articles: UsageItem;
    storage: UsageItem;
    aiTokens: UsageItem;
    users: UsageItem;
  };
  features: Record<string, boolean>;
  period: string;
}

const FEATURE_LABELS: Record<string, string> = {
  aiGeneration: "AI İçerik Üretimi",
  aiModeration: "AI Moderasyon",
  videoStudio: "Video Stüdyosu",
  newsletter: "Newsletter",
  pushNotifications: "Push Bildirimleri",
  customDomain: "Özel Domain",
  apiAccess: "API Erişimi",
  prioritySupport: "Öncelikli Destek",
};

export default function AdminBillingPage() {
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgradeLoading, setUpgradeLoading] = useState(false);

  useEffect(() => {
    fetchBillingData();
  }, []);

  const fetchBillingData = async () => {
    try {
      const res = await fetch("/api/admin/billing");
      const result = await res.json();
      if (res.ok) {
        setData(result);
      }
    } catch (error) {
      console.error("Error fetching billing data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradeRequest = async (targetPlan: string) => {
    setUpgradeLoading(true);
    try {
      const res = await fetch("/api/admin/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request_upgrade", targetPlan }),
      });
      const result = await res.json();
      if (res.ok) {
        alert(result.message);
      } else {
        alert(result.error || "İşlem başarısız");
      }
    } catch (error) {
      console.error("Error requesting upgrade:", error);
      alert("Bir hata oluştu");
    } finally {
      setUpgradeLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = "TRY") => {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatStorage = (mb: number) => {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${mb} MB`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Billing bilgileri yüklenemedi
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Plan ve Kullanım</h1>
        <p className="text-muted-foreground">
          Abonelik durumunuz ve kullanım istatistikleriniz
        </p>
      </div>

      {/* Current Plan */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <CreditCard className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{data.currentPlan.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {data.currentPlan.description}
                </p>
              </div>
            </div>
          </div>
          <div className="text-right">
            {data.currentPlan.pricing.monthly > 0 ? (
              <>
                <p className="text-2xl font-bold">
                  {formatCurrency(data.currentPlan.pricing.monthly)}
                  <span className="text-sm font-normal text-muted-foreground">
                    /ay
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">
                  veya {formatCurrency(data.currentPlan.pricing.yearly)}/yıl
                </p>
              </>
            ) : (
              <p className="text-lg font-medium text-muted-foreground">
                Özel Fiyatlandırma
              </p>
            )}
          </div>
        </div>

        {data.subscription && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center gap-4 text-sm">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium",
                  data.subscription.status === "ACTIVE"
                    ? "bg-green-500/20 text-green-600"
                    : data.subscription.status === "TRIALING"
                    ? "bg-blue-500/20 text-blue-600"
                    : "bg-yellow-500/20 text-yellow-600"
                )}
              >
                {data.subscription.status === "ACTIVE"
                  ? "Aktif"
                  : data.subscription.status === "TRIALING"
                  ? "Deneme Sürümü"
                  : "Ödeme Bekliyor"}
              </span>
              {data.subscription.currentPeriodEnd && (
                <span className="text-muted-foreground">
                  Dönem sonu:{" "}
                  {new Date(data.subscription.currentPeriodEnd).toLocaleDateString(
                    "tr-TR"
                  )}
                </span>
              )}
              {data.subscription.cancelAtPeriodEnd && (
                <span className="text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  Dönem sonunda iptal edilecek
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Usage */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-bold mb-4">Bu Ayki Kullanım</h3>
        <div className="grid grid-cols-2 gap-6">
          <UsageCard
            icon={FileText}
            label="Makale"
            current={data.usage.articles.current}
            limit={data.usage.articles.limit}
            percentage={data.usage.articles.percentage}
          />
          <UsageCard
            icon={Users}
            label="Kullanıcı"
            current={data.usage.users.current}
            limit={data.usage.users.limit}
            percentage={data.usage.users.percentage}
          />
          <UsageCard
            icon={HardDrive}
            label="Depolama"
            current={data.usage.storage.current}
            limit={data.usage.storage.limit}
            percentage={data.usage.storage.percentage}
            formatValue={formatStorage}
          />
          <UsageCard
            icon={Sparkles}
            label="AI Token"
            current={data.usage.aiTokens.current}
            limit={data.usage.aiTokens.limit}
            percentage={data.usage.aiTokens.percentage}
            formatValue={(v) => v.toLocaleString("tr-TR")}
          />
        </div>
      </div>

      {/* Features */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-bold mb-4">Özellikler</h3>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(FEATURE_LABELS).map(([key, label]) => {
            const enabled = data.features[key];
            return (
              <div
                key={key}
                className={cn(
                  "flex items-center gap-2 rounded-lg p-3",
                  enabled ? "bg-green-500/10" : "bg-muted"
                )}
              >
                {enabled ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <X className="h-4 w-4 text-muted-foreground" />
                )}
                <span
                  className={cn(
                    "text-sm",
                    enabled ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Upgrade Options */}
      {data.currentPlan.id !== "ENTERPRISE" && (
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-lg font-bold mb-4">Plan Yükselt</h3>
          <div className="grid grid-cols-3 gap-4">
            {data.availablePlans.map((plan) => (
              <div
                key={plan.id}
                className={cn(
                  "rounded-lg border p-4",
                  plan.isCurrent
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <h4 className="font-bold">{plan.name}</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  {plan.description}
                </p>
                {plan.pricing.monthly > 0 ? (
                  <p className="text-lg font-bold mb-3">
                    {formatCurrency(plan.pricing.monthly)}
                    <span className="text-sm font-normal text-muted-foreground">
                      /ay
                    </span>
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground mb-3">
                    Özel Fiyat
                  </p>
                )}
                {plan.isCurrent ? (
                  <span className="inline-flex items-center gap-1 text-sm text-primary">
                    <Check className="h-4 w-4" />
                    Mevcut Plan
                  </span>
                ) : (
                  <button
                    onClick={() => handleUpgradeRequest(plan.id)}
                    disabled={upgradeLoading}
                    className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {upgradeLoading ? "İşleniyor..." : "Yükselt"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function UsageCard({
  icon: Icon,
  label,
  current,
  limit,
  percentage,
  formatValue = (v: number) => v.toString(),
}: {
  icon: React.ElementType;
  label: string;
  current: number;
  limit: number;
  percentage: number;
  formatValue?: (value: number) => string;
}) {
  const isUnlimited = limit === -1;
  const isWarning = percentage >= 80;
  const isDanger = percentage >= 95;

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="flex items-end justify-between mb-2">
        <span className="text-2xl font-bold">{formatValue(current)}</span>
        <span className="text-sm text-muted-foreground">
          / {isUnlimited ? "∞" : formatValue(limit)}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            isDanger
              ? "bg-red-500"
              : isWarning
              ? "bg-yellow-500"
              : "bg-green-500"
          )}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      {!isUnlimited && percentage >= 80 && (
        <p className="mt-2 text-xs text-yellow-600 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Limitinize yaklaşıyorsunuz
        </p>
      )}
    </div>
  );
}
