"use client";

import { useState, useEffect } from "react";
import {
  Activity,
  Database,
  Server,
  Clock,
  Users,
  Building2,
  FileText,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SystemStatus {
  status: "operational" | "degraded" | "error";
  timestamp: string;
  services: {
    database: {
      status: string;
      latency: number;
    };
    api: {
      status: string;
      responseTime: number;
    };
  };
  metrics: {
    today: {
      newTenants: number;
      newUsers: number;
      newArticles: number;
    };
    total: {
      tenants: number;
      activeTenants: number;
      users: number;
      articles: number;
    };
    planDistribution: Record<string, number>;
  };
  recentActivity: {
    tenants: Array<{
      id: string;
      name: string;
      slug: string;
      createdAt: string;
    }>;
    users: Array<{
      id: string;
      email: string;
      name: string | null;
      createdAt: string;
    }>;
  };
}

export default function SuperAdminSystemPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStatus = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch("/api/superadmin/system");
      const data = await res.json();
      if (res.ok) {
        setStatus(data);
      }
    } catch (error) {
      console.error("Error fetching system status:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(() => fetchStatus(true), 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (s: string) => {
    switch (s) {
      case "healthy":
      case "operational":
        return <CheckCircle className="h-5 w-5 text-green-400" />;
      case "degraded":
        return <AlertCircle className="h-5 w-5 text-yellow-400" />;
      default:
        return <XCircle className="h-5 w-5 text-red-400" />;
    }
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case "healthy":
      case "operational":
        return "bg-green-500/20 text-green-400";
      case "degraded":
        return "bg-yellow-500/20 text-yellow-400";
      default:
        return "bg-red-500/20 text-red-400";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-500 border-t-transparent" />
      </div>
    );
  }

  if (!status) {
    return (
      <div className="text-center py-12 text-zinc-500">
        Sistem durumu alınamadı
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sistem Durumu</h1>
          <p className="text-zinc-400">Platform sağlığı ve performans metrikleri</p>
        </div>
        <button
          onClick={() => fetchStatus(true)}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          Yenile
        </button>
      </div>

      {/* Overall Status */}
      <div className="mb-6 rounded-lg border border-zinc-800 bg-zinc-900 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {getStatusIcon(status.status)}
            <div>
              <h2 className="text-lg font-bold">
                {status.status === "operational"
                  ? "Tüm Sistemler Çalışıyor"
                  : status.status === "degraded"
                  ? "Bazı Sistemlerde Sorun Var"
                  : "Sistem Hatası"}
              </h2>
              <p className="text-sm text-zinc-400">
                Son güncelleme: {new Date(status.timestamp).toLocaleString("tr-TR")}
              </p>
            </div>
          </div>
          <span
            className={cn(
              "rounded-full px-4 py-1 text-sm font-medium",
              getStatusColor(status.status)
            )}
          >
            {status.status === "operational"
              ? "Operasyonel"
              : status.status === "degraded"
              ? "Kısmi Sorun"
              : "Hata"}
          </span>
        </div>
      </div>

      {/* Services */}
      <div className="mb-6 grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20">
                <Database className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="font-medium">Veritabanı</p>
                <p className="text-sm text-zinc-500">PostgreSQL</p>
              </div>
            </div>
            {getStatusIcon(status.services.database.status)}
          </div>
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Clock className="h-4 w-4" />
            Gecikme: {status.services.database.latency}ms
          </div>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20">
                <Server className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="font-medium">API</p>
                <p className="text-sm text-zinc-500">Next.js</p>
              </div>
            </div>
            {getStatusIcon(status.services.api.status)}
          </div>
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Clock className="h-4 w-4" />
            Yanıt süresi: {status.services.api.responseTime}ms
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="mb-6">
        <h3 className="text-lg font-bold mb-4">Bugünkü Aktivite</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex items-center gap-3 mb-2">
              <Building2 className="h-5 w-5 text-blue-400" />
              <span className="text-sm text-zinc-400">Yeni Tenant</span>
            </div>
            <p className="text-2xl font-bold">{status.metrics.today.newTenants}</p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex items-center gap-3 mb-2">
              <Users className="h-5 w-5 text-green-400" />
              <span className="text-sm text-zinc-400">Yeni Kullanıcı</span>
            </div>
            <p className="text-2xl font-bold">{status.metrics.today.newUsers}</p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="h-5 w-5 text-purple-400" />
              <span className="text-sm text-zinc-400">Yeni Makale</span>
            </div>
            <p className="text-2xl font-bold">{status.metrics.today.newArticles}</p>
          </div>
        </div>
      </div>

      {/* Plan Distribution */}
      <div className="mb-6">
        <h3 className="text-lg font-bold mb-4">Plan Dağılımı</h3>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex gap-4">
            {Object.entries(status.metrics.planDistribution).map(([plan, count]) => (
              <div key={plan} className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-zinc-400">{plan}</span>
                  <span className="font-bold">{count}</span>
                </div>
                <div className="h-2 rounded-full bg-zinc-700">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      plan === "STARTER"
                        ? "bg-zinc-500"
                        : plan === "PROFESSIONAL"
                        ? "bg-blue-500"
                        : "bg-amber-500"
                    )}
                    style={{
                      width: `${(count / status.metrics.total.tenants) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-bold mb-4">Son Eklenen Tenant'lar</h3>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800">
            {status.recentActivity.tenants.map((tenant) => (
              <div key={tenant.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{tenant.name}</p>
                  <p className="text-sm text-zinc-500">{tenant.slug}</p>
                </div>
                <span className="text-sm text-zinc-400">
                  {new Date(tenant.createdAt).toLocaleDateString("tr-TR")}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-bold mb-4">Son Kayıt Olan Kullanıcılar</h3>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800">
            {status.recentActivity.users.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{user.name || "İsimsiz"}</p>
                  <p className="text-sm text-zinc-500">{user.email}</p>
                </div>
                <span className="text-sm text-zinc-400">
                  {new Date(user.createdAt).toLocaleDateString("tr-TR")}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
