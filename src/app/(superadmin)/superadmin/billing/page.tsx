"use client";

import { useState, useEffect } from "react";
import {
  CreditCard,
  TrendingUp,
  Users,
  Building2,
  DollarSign,
  Clock,
  RefreshCw,
  ChevronDown,
  Check,
  AlertCircle,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PlanDistribution {
  plan: string;
  name: string;
  count: number;
  pricing: {
    monthly: number;
    yearly: number;
    currency: string;
  };
}

interface Overview {
  totalTenants: number;
  activeSubscriptions: number;
  trialingTenants: number;
  newTenantsLast30Days: number;
  estimatedMRR: number;
  currency: string;
}

interface TenantUsage {
  id: string;
  name: string;
  slug: string;
  plan: string;
  isActive: boolean;
  subscription: {
    status: string;
    currentPeriodEnd: string | null;
  } | null;
  usage: {
    articles: number;
    articlesLimit: number;
    storage: number;
    storageLimit: number;
    aiTokens: number;
    aiTokensLimit: number;
    users: number;
    usersLimit: number;
  };
}

const PLAN_COLORS: Record<string, string> = {
  STARTER: "bg-zinc-500",
  PROFESSIONAL: "bg-blue-500",
  ENTERPRISE: "bg-amber-500",
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-500/20 text-green-400",
  TRIALING: "bg-blue-500/20 text-blue-400",
  PAST_DUE: "bg-yellow-500/20 text-yellow-400",
  CANCELED: "bg-red-500/20 text-red-400",
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Aktif",
  TRIALING: "Deneme",
  PAST_DUE: "Ödeme Bekliyor",
  CANCELED: "İptal",
};

export default function SuperAdminBillingPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [planDistribution, setPlanDistribution] = useState<PlanDistribution[]>([]);
  const [tenantsUsage, setTenantsUsage] = useState<TenantUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "usage">("overview");
  const [actionMenu, setActionMenu] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [overviewRes, usageRes] = await Promise.all([
        fetch("/api/superadmin/billing?view=overview"),
        fetch("/api/superadmin/billing?view=usage"),
      ]);

      const overviewData = await overviewRes.json();
      const usageData = await usageRes.json();

      if (overviewRes.ok) {
        setOverview(overviewData.overview);
        setPlanDistribution(overviewData.planDistribution);
      }

      if (usageRes.ok) {
        setTenantsUsage(usageData.tenantsUsage);
      }
    } catch (error) {
      console.error("Error fetching billing data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePlan = async (tenantId: string, newPlan: string) => {
    try {
      const res = await fetch("/api/superadmin/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "change_plan", tenantId, plan: newPlan }),
      });

      if (res.ok) {
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || "Plan değiştirme başarısız");
      }
    } catch (error) {
      console.error("Error changing plan:", error);
    }
    setActionMenu(null);
  };

  const handleExtendTrial = async (tenantId: string) => {
    try {
      const res = await fetch("/api/superadmin/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "extend_trial", tenantId }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        fetchData();
      } else {
        alert(data.error || "İşlem başarısız");
      }
    } catch (error) {
      console.error("Error extending trial:", error);
    }
    setActionMenu(null);
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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Abonelik Yönetimi</h1>
          <p className="text-zinc-400">Gelir ve kullanım istatistikleri</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          <RefreshCw className="h-4 w-4" />
          Yenile
        </button>
      </div>

      {/* Overview Cards */}
      {overview && (
        <div className="mb-6 grid grid-cols-4 gap-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/20">
                <DollarSign className="h-5 w-5 text-green-400" />
              </div>
              <span className="text-sm text-zinc-400">Tahmini MRR</span>
            </div>
            <p className="text-2xl font-bold">
              {formatCurrency(overview.estimatedMRR)}
            </p>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20">
                <CreditCard className="h-5 w-5 text-blue-400" />
              </div>
              <span className="text-sm text-zinc-400">Aktif Abonelik</span>
            </div>
            <p className="text-2xl font-bold">{overview.activeSubscriptions}</p>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20">
                <Clock className="h-5 w-5 text-purple-400" />
              </div>
              <span className="text-sm text-zinc-400">Deneme Sürümü</span>
            </div>
            <p className="text-2xl font-bold">{overview.trialingTenants}</p>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20">
                <TrendingUp className="h-5 w-5 text-amber-400" />
              </div>
              <span className="text-sm text-zinc-400">Son 30 Gün</span>
            </div>
            <p className="text-2xl font-bold">+{overview.newTenantsLast30Days}</p>
          </div>
        </div>
      )}

      {/* Plan Distribution */}
      <div className="mb-6 rounded-lg border border-zinc-800 bg-zinc-900 p-6">
        <h3 className="text-lg font-bold mb-4">Plan Dağılımı</h3>
        <div className="grid grid-cols-3 gap-4">
          {planDistribution.map((plan) => (
            <div
              key={plan.plan}
              className="rounded-lg border border-zinc-700 p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className={cn("h-3 w-3 rounded-full", PLAN_COLORS[plan.plan])}
                  />
                  <span className="font-medium">{plan.name}</span>
                </div>
                <span className="text-2xl font-bold">{plan.count}</span>
              </div>
              <p className="text-sm text-zinc-400">
                {plan.pricing.monthly > 0
                  ? `${formatCurrency(plan.pricing.monthly)}/ay`
                  : "Özel Fiyat"}
              </p>
              {plan.pricing.monthly > 0 && (
                <p className="text-xs text-zinc-500 mt-1">
                  Toplam: {formatCurrency(plan.pricing.monthly * plan.count)}/ay
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-2 border-b border-zinc-800">
        <button
          onClick={() => setActiveTab("overview")}
          className={cn(
            "px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors",
            activeTab === "overview"
              ? "border-red-500 text-white"
              : "border-transparent text-zinc-400 hover:text-white"
          )}
        >
          Abonelikler
        </button>
        <button
          onClick={() => setActiveTab("usage")}
          className={cn(
            "px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors",
            activeTab === "usage"
              ? "border-red-500 text-white"
              : "border-transparent text-zinc-400 hover:text-white"
          )}
        >
          Kullanım Detayları
        </button>
      </div>

      {/* Tenants Table */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 overflow-hidden">
        <table className="w-full">
          <thead className="bg-zinc-800/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                Tenant
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                Plan
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                Durum
              </th>
              {activeTab === "usage" && (
                <>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                    Makale
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                    Kullanıcı
                  </th>
                </>
              )}
              <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase">
                İşlemler
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {tenantsUsage.map((tenant) => (
              <tr key={tenant.id} className="hover:bg-zinc-800/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "h-10 w-10 rounded-lg flex items-center justify-center",
                        tenant.isActive ? "bg-zinc-700" : "bg-zinc-800"
                      )}
                    >
                      <Building2
                        className={cn(
                          "h-5 w-5",
                          tenant.isActive ? "text-zinc-300" : "text-zinc-500"
                        )}
                      />
                    </div>
                    <div>
                      <p className="font-medium">{tenant.name}</p>
                      <p className="text-sm text-zinc-500">{tenant.slug}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium",
                      tenant.plan === "STARTER"
                        ? "bg-zinc-500/20 text-zinc-400"
                        : tenant.plan === "PROFESSIONAL"
                        ? "bg-blue-500/20 text-blue-400"
                        : "bg-amber-500/20 text-amber-400"
                    )}
                  >
                    {tenant.plan}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2 py-1 text-xs font-medium",
                      STATUS_COLORS[tenant.subscription?.status || "TRIALING"]
                    )}
                  >
                    {STATUS_LABELS[tenant.subscription?.status || "TRIALING"]}
                  </span>
                </td>
                {activeTab === "usage" && (
                  <>
                    <td className="px-4 py-3">
                      <UsageBar
                        current={tenant.usage.articles}
                        limit={tenant.usage.articlesLimit}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <UsageBar
                        current={tenant.usage.users}
                        limit={tenant.usage.usersLimit}
                      />
                    </td>
                  </>
                )}
                <td className="px-4 py-3 text-right">
                  <div className="relative">
                    <button
                      onClick={() =>
                        setActionMenu(actionMenu === tenant.id ? null : tenant.id)
                      }
                      className="rounded p-1 hover:bg-zinc-700"
                    >
                      <ChevronDown className="h-4 w-4 text-zinc-400" />
                    </button>

                    {actionMenu === tenant.id && (
                      <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded-lg border border-zinc-700 bg-zinc-800 py-1 shadow-lg">
                        <div className="px-3 py-2 text-xs font-medium text-zinc-500 uppercase">
                          Plan Değiştir
                        </div>
                        {["STARTER", "PROFESSIONAL", "ENTERPRISE"].map((plan) => (
                          <button
                            key={plan}
                            onClick={() => handleChangePlan(tenant.id, plan)}
                            className={cn(
                              "flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-zinc-700",
                              tenant.plan === plan
                                ? "text-red-400"
                                : "text-zinc-300"
                            )}
                          >
                            {plan}
                            {tenant.plan === plan && (
                              <Check className="h-4 w-4" />
                            )}
                          </button>
                        ))}
                        <div className="my-1 border-t border-zinc-700" />
                        <button
                          onClick={() => handleExtendTrial(tenant.id)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
                        >
                          <Clock className="h-4 w-4" />
                          Deneme Süresini Uzat
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UsageBar({ current, limit }: { current: number; limit: number }) {
  const isUnlimited = limit === -1;
  const percentage = isUnlimited ? 0 : Math.min((current / limit) * 100, 100);
  const isWarning = percentage >= 80;
  const isDanger = percentage >= 95;

  return (
    <div className="w-24">
      <div className="flex items-center justify-between text-xs mb-1">
        <span>{current}</span>
        <span className="text-zinc-500">
          {isUnlimited ? "∞" : `/ ${limit}`}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-zinc-700">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            isDanger
              ? "bg-red-500"
              : isWarning
              ? "bg-yellow-500"
              : "bg-green-500"
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
