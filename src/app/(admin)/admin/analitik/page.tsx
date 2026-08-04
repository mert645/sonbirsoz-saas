"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, Users, BarChart3, TrendingUp } from "lucide-react";
import { formatNumber, formatRelativeTime } from "@/lib/utils/format";

interface Stats {
  totalArticles: number;
  published: number;
  draft: number;
  review: number;
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

function SkeletonRow() {
  return (
    <div className="flex items-center justify-between border-b pb-3 last:border-0">
      <div className="h-4 w-48 animate-pulse rounded bg-muted" />
      <div className="h-4 w-14 animate-pulse rounded bg-muted" />
    </div>
  );
}

function SkeletonBar() {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="h-4 w-10 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-2 w-full animate-pulse rounded-full bg-muted" />
    </div>
  );
}

export default function AdminAnalitikPage() {
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

  const summaryCards = stats
    ? [
        {
          name: "Toplam Görüntülenme",
          value: formatNumber(stats.totalViews),
          icon: Eye,
          note: "tüm haberler",
        },
        {
          name: "Yayınlanan Haber",
          value: formatNumber(stats.published),
          icon: BarChart3,
          note: `${formatNumber(stats.totalArticles)} toplam`,
        },
        {
          name: "Son 7 Gün",
          value: formatNumber(stats.last7Days),
          icon: TrendingUp,
          note: "yayınlanan haber",
        },
        {
          name: "Aktif Yazarlar",
          value: formatNumber(stats.totalAuthors),
          icon: Users,
          note: "kayıtlı yazar",
        },
      ]
    : [];

  return (
    <div>
      <h1 className="text-2xl font-bold">Analitik</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        İçerik ve görüntülenme istatistikleri
      </p>

      {/* Özet Kartlar */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-4 animate-pulse rounded bg-muted" />
                </CardHeader>
                <CardContent>
                  <div className="h-8 w-20 animate-pulse rounded bg-muted" />
                  <div className="mt-1 h-3 w-24 animate-pulse rounded bg-muted" />
                </CardContent>
              </Card>
            ))
          : summaryCards.map((card) => (
              <Card key={card.name}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {card.name}
                  </CardTitle>
                  <card.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{card.value}</div>
                  <p className="mt-1 text-xs text-muted-foreground">{card.note}</p>
                </CardContent>
              </Card>
            ))}
      </div>

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
                  <SkeletonRow key={i} />
                ))}
              </div>
            ) : !stats?.topArticles.length ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Henüz yayınlanmış haber yok.
              </p>
            ) : (
              <div className="space-y-3">
                {stats.topArticles.map((article, i) => (
                  <div
                    key={article.id}
                    className="flex items-center justify-between border-b border-border pb-3 last:border-0"
                  >
                    <div className="flex min-w-0 items-center gap-3">
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
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: article.category.color }}
                          />
                          <span className="text-xs text-muted-foreground">
                            {article.category.name}
                            {article.publishedAt &&
                              ` · ${formatRelativeTime(article.publishedAt)}`}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="ml-3 shrink-0 text-right">
                      <span className="text-sm font-semibold">
                        {formatNumber(article.viewCount)}
                      </span>
                      <p className="text-xs text-muted-foreground">görüntülenme</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Kategori Dağılımı */}
        <Card>
          <CardHeader>
            <CardTitle>Kategori Bazında Haber Dağılımı</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonBar key={i} />
                ))}
              </div>
            ) : !stats?.categoryBreakdown.length ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Henüz kategori verisi yok.
              </p>
            ) : (
              <div className="space-y-3">
                {stats.categoryBreakdown.map((cat) => {
                  const max = stats.categoryBreakdown[0].count;
                  const pct = Math.round((cat.count / max) * 100);
                  const totalPct =
                    stats.totalArticles > 0
                      ? Math.round((cat.count / stats.totalArticles) * 100)
                      : 0;
                  return (
                    <div key={cat.id} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: cat.color }}
                          />
                          <span className="font-medium">{cat.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span>{formatNumber(cat.count)} haber</span>
                          <span className="text-xs opacity-60">%{totalPct}</span>
                        </div>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted">
                        <div
                          className="h-full rounded-full transition-all duration-500"
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

      {/* Durum Özeti */}
      {!loading && stats && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Haber Durum Özeti</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: "Yayında", value: stats.published, color: "bg-emerald-500", textColor: "text-emerald-600 dark:text-emerald-400" },
                { label: "Taslak", value: stats.draft, color: "bg-amber-500", textColor: "text-amber-600 dark:text-amber-400" },
                { label: "İncelemede", value: stats.review, color: "bg-blue-500", textColor: "text-blue-600 dark:text-blue-400" },
                { label: "Toplam", value: stats.totalArticles, color: "bg-primary", textColor: "text-primary" },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border p-4 text-center">
                  <div className={`text-3xl font-bold ${item.textColor}`}>
                    {formatNumber(item.value)}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">{item.label}</div>
                  <div className="mt-2 h-1 w-full rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${item.color}`}
                      style={{
                        width: stats.totalArticles > 0
                          ? `${Math.round((item.value / stats.totalArticles) * 100)}%`
                          : "0%",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* GA Notu */}
      <div className="mt-4 rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
        Ziyaretçi sayısı, oturum süresi ve trafik kaynakları için{" "}
        <strong>Google Analytics</strong> entegrasyonu gereklidir.
        GA ID&apos;yi Ayarlar sayfasından tanımlayabilirsiniz.
      </div>
    </div>
  );
}
