"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Eye, Users, TrendingUp } from "lucide-react";
import { formatNumber, formatRelativeTime } from "@/lib/utils/format";

interface Stats {
  totalArticles: number;
  published: number;
  draft: number;
  review: number;
  archived: number;
  totalViews: number;
  last7Days: number;
  totalAuthors: number;
  topArticles: {
    id: string;
    title: string;
    slug: string;
    viewCount: number;
    publishedAt: string | null;
    category: { name: string; slug: string; color: string };
  }[];
  categoryBreakdown: {
    id: string;
    name: string;
    slug: string;
    color: string;
    count: number;
  }[];
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="h-4 w-28 animate-pulse rounded bg-muted" />
        <div className="h-4 w-4 animate-pulse rounded bg-muted" />
      </CardHeader>
      <CardContent>
        <div className="h-8 w-20 animate-pulse rounded bg-muted" />
        <div className="mt-1 h-3 w-24 animate-pulse rounded bg-muted" />
      </CardContent>
    </Card>
  );
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  PUBLISHED: { label: "Yayında", cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  DRAFT: { label: "Taslak", cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  REVIEW: { label: "İncelemede", cls: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  ARCHIVED: { label: "Arşiv", cls: "bg-muted text-muted-foreground" },
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/stats");
      if (!res.ok) return;
      const json = await res.json();
      setStats(json.data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const topCards = stats
    ? [
        {
          name: "Toplam Haber",
          value: formatNumber(stats.totalArticles),
          icon: FileText,
          change: `${stats.published} yayında`,
        },
        {
          name: "Toplam Görüntülenme",
          value: formatNumber(stats.totalViews),
          icon: Eye,
          change: "tüm zamanlar",
        },
        {
          name: "Aktif Yazarlar",
          value: formatNumber(stats.totalAuthors),
          icon: Users,
          change: "aktif hesaplar",
        },
        {
          name: "Son 7 Gün",
          value: formatNumber(stats.last7Days),
          icon: TrendingUp,
          change: "yayınlanan haber",
        },
      ]
    : [];

  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Sitenizin genel durumu ve istatistikleri
      </p>

      {/* Stat Cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          : topCards.map((stat) => (
              <Card key={stat.name}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.name}
                  </CardTitle>
                  <stat.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="mt-1 text-xs text-muted-foreground">{stat.change}</p>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Status Breakdown */}
      {!loading && stats && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(["PUBLISHED", "DRAFT", "REVIEW", "ARCHIVED"] as const).map((s) => {
            const count = stats[s.toLowerCase() as keyof Stats] as number;
            const { label, cls } = STATUS_LABELS[s];
            return (
              <div
                key={s}
                className="flex items-center justify-between rounded-lg border px-4 py-3"
              >
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>
                  {formatNumber(count)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* En Çok Okunanlar */}
        <Card>
          <CardHeader>
            <CardTitle>En Çok Okunan Haberler</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between border-b pb-3 last:border-0">
                    <div className="h-4 w-48 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-12 animate-pulse rounded bg-muted" />
                  </div>
                ))}
              </div>
            ) : stats?.topArticles.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Henüz yayınlanmış haber yok.
              </p>
            ) : (
              <div className="space-y-3">
                {stats?.topArticles.map((article, i) => (
                  <div
                    key={article.id}
                    className="flex items-center justify-between border-b border-border pb-3 last:border-0"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="shrink-0 text-sm font-bold text-primary">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <Link
                          href={`/${article.category.slug}/${article.slug}`}
                          target="_blank"
                          className="line-clamp-1 text-sm font-medium hover:text-primary"
                        >
                          {article.title}
                        </Link>
                        {article.publishedAt && (
                          <p className="text-xs text-muted-foreground">
                            {formatRelativeTime(article.publishedAt)}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="ml-3 shrink-0 text-sm font-medium text-muted-foreground">
                      {formatNumber(article.viewCount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Kategori Dağılımı */}
        <Card>
          <CardHeader>
            <CardTitle>Kategori Dağılımı</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="space-y-1">
                    <div className="h-4 w-full animate-pulse rounded bg-muted" />
                    <div className="h-2 w-full animate-pulse rounded bg-muted" />
                  </div>
                ))}
              </div>
            ) : !stats?.categoryBreakdown.length ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Henüz kategori verisi yok.
              </p>
            ) : (
              <div className="space-y-3">
                {stats.categoryBreakdown.map((cat) => {
                  const max = stats.categoryBreakdown[0].count;
                  const pct = Math.round((cat.count / max) * 100);
                  return (
                    <div key={cat.id} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{cat.name}</span>
                        <span className="text-muted-foreground">
                          {formatNumber(cat.count)}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: cat.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
