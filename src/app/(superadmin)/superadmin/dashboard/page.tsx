"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Users,
  TrendingUp,
  AlertCircle,
  ArrowUpRight,
  Activity,
} from "lucide-react";

interface DashboardStats {
  totalTenants: number;
  activeTenants: number;
  totalUsers: number;
  totalArticles: number;
  recentTenants: Array<{
    id: string;
    name: string;
    slug: string;
    plan: string;
    createdAt: string;
    _count: { articles: number; users: number };
  }>;
  planDistribution: Array<{ plan: string; _count: { _all: number } }>;
}

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/superadmin/stats")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setStats(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-500 border-t-transparent" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-400">
        <AlertCircle className="h-5 w-5 mr-2" />
        Veriler yüklenemedi
      </div>
    );
  }

  const statCards = [
    {
      title: "Toplam Tenant",
      value: stats.totalTenants,
      icon: Building2,
      color: "bg-blue-500/10 text-blue-400",
    },
    {
      title: "Aktif Tenant",
      value: stats.activeTenants,
      icon: Activity,
      color: "bg-green-500/10 text-green-400",
    },
    {
      title: "Toplam Kullanıcı",
      value: stats.totalUsers,
      icon: Users,
      color: "bg-purple-500/10 text-purple-400",
    },
    {
      title: "Toplam Makale",
      value: stats.totalArticles,
      icon: TrendingUp,
      color: "bg-amber-500/10 text-amber-400",
    },
  ];

  const planColors: Record<string, string> = {
    STARTER: "bg-zinc-500",
    PROFESSIONAL: "bg-blue-500",
    ENTERPRISE: "bg-amber-500",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Super Admin Dashboard</h1>
        <p className="text-zinc-400">Platform genelindeki istatistikler</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <div
            key={stat.title}
            className="rounded-lg border border-zinc-800 bg-zinc-900 p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">{stat.title}</span>
              <div className={`rounded-lg p-2 ${stat.color}`}>
                <stat.icon className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-3xl font-bold">{stat.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Plan Distribution */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <h2 className="text-lg font-semibold mb-4">Plan Dağılımı</h2>
          <div className="space-y-3">
            {stats.planDistribution.map((item) => {
              const percentage = stats.totalTenants > 0 
                ? Math.round((item._count._all / stats.totalTenants) * 100) 
                : 0;
              return (
                <div key={item.plan}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-zinc-300">{item.plan}</span>
                    <span className="text-zinc-400">
                      {item._count._all} ({percentage}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-zinc-800">
                    <div
                      className={`h-2 rounded-full ${planColors[item.plan] || "bg-zinc-500"}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Tenants */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Son Eklenen Tenant'lar</h2>
            <Link
              href="/superadmin/tenants"
              className="text-sm text-red-400 hover:text-red-300 flex items-center gap-1"
            >
              Tümünü Gör <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {stats.recentTenants.map((tenant) => (
              <Link
                key={tenant.id}
                href={`/superadmin/tenants/${tenant.id}`}
                className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
              >
                <div>
                  <p className="font-medium">{tenant.name}</p>
                  <p className="text-sm text-zinc-400">{tenant.slug}</p>
                </div>
                <div className="text-right">
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      tenant.plan === "ENTERPRISE"
                        ? "bg-amber-500/20 text-amber-400"
                        : tenant.plan === "PROFESSIONAL"
                        ? "bg-blue-500/20 text-blue-400"
                        : "bg-zinc-500/20 text-zinc-400"
                    }`}
                  >
                    {tenant.plan}
                  </span>
                  <p className="text-xs text-zinc-500 mt-1">
                    {tenant._count.articles} makale · {tenant._count.users} kullanıcı
                  </p>
                </div>
              </Link>
            ))}
            {stats.recentTenants.length === 0 && (
              <p className="text-center text-zinc-500 py-4">Henüz tenant yok</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
