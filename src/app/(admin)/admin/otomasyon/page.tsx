"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Rss,
  Bot,
  Share2,
  Loader2,
  Download,
  Newspaper,
} from "lucide-react";

interface AutomationStats {
  rss: {
    activeSources: number;
    unprocessed: number;
    collectedToday: number;
    lastRun: string | null;
    lastSource: string | null;
  };
  ai: {
    generatedToday: number;
    generatedTotal: number;
    lastRun: string | null;
  };
  social: {
    postedToday: number;
    failed: number;
    lastRun: string | null;
  };
}

function formatRelative(iso: string | null): string {
  if (!iso) return "Henüz çalışmadı";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "az önce";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} dk önce`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} saat önce`;
  return new Date(iso).toLocaleDateString("tr-TR");
}

interface Job {
  id: string;
  name: string;
  description: string;
  schedule: string;
  cronPath: string;
  icon: React.ReactNode;
  lastRun: string | null;
  stat: string;
  status: "ok" | "warning" | "idle";
}

export default function AdminOtomasyonPage() {
  const [stats, setStats] = useState<AutomationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [triggering, setTriggering] = useState<string | null>(null);
  const [triggerResults, setTriggerResults] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string>("");

  const fetchStats = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetch("/api/admin/automation");
      if (res.ok) setStats(await res.json());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats(false);
  }, [fetchStats]);

  const importSonbirsoz = async () => {
    setImporting(true);
    setImportResult("");
    try {
      const res = await fetch("/api/admin/import-sonbirsoz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 80 }),
      });
      const data = await res.json();
      if (res.ok) {
        setImportResult(
          `✓ ${data.created} yeni, ${data.updated} güncellendi (${data.fetched} çekildi)` +
            (data.errors?.length ? `, ${data.errors.length} hata` : ""),
        );
        await fetchStats(false);
      } else {
        setImportResult(data.error ?? "İçe aktarma başarısız");
      }
    } catch {
      setImportResult("Bağlantı hatası");
    } finally {
      setImporting(false);
    }
  };

  const triggerJob = async (jobId: string, cronPath: string) => {
    setTriggering(jobId);
    setTriggerResults((prev) => ({ ...prev, [jobId]: "" }));
    try {
      const res = await fetch(`/api/admin/trigger-cron/${cronPath}`, {
        method: "POST",
      });
      const data = await res.json();
      const msg = res.ok
        ? data.message ??
          `${data.newItems ?? data.generated ?? data.processed ?? "✓"} işlem tamamlandı`
        : data.error ?? "Hata oluştu";
      setTriggerResults((prev) => ({ ...prev, [jobId]: msg }));
      await fetchStats(false);
    } catch {
      setTriggerResults((prev) => ({ ...prev, [jobId]: "Bağlantı hatası" }));
    } finally {
      setTriggering(null);
    }
  };

  const jobs: Job[] = stats
    ? [
        {
          id: "collect",
          name: "RSS Haber Toplama",
          description: `${stats.rss.activeSources} aktif kaynak · ${stats.rss.unprocessed} işlenmemiş öğe`,
          schedule: "Her 30 dakika",
          cronPath: "collect-news",
          icon: <Rss className="h-5 w-5" />,
          lastRun: stats.rss.lastRun,
          stat: `${stats.rss.collectedToday} öğe bugün`,
          status: stats.rss.activeSources === 0 ? "warning" : "ok",
        },
        {
          id: "generate",
          name: "AI Haber Üretimi",
          description: `Toplam ${stats.ai.generatedTotal} haber üretildi`,
          schedule: "Her 2 saat",
          cronPath: "generate-articles",
          icon: <Bot className="h-5 w-5" />,
          lastRun: stats.ai.lastRun,
          stat: `${stats.ai.generatedToday} haber bugün`,
          status: stats.ai.lastRun ? "ok" : "idle",
        },
        {
          id: "social",
          name: "Sosyal Medya Paylaşım",
          description: `${stats.social.failed} başarısız paylaşım bekliyor`,
          schedule: "Her 1 saat",
          cronPath: "social-post",
          icon: <Share2 className="h-5 w-5" />,
          lastRun: stats.social.lastRun,
          stat: `${stats.social.postedToday} paylaşım bugün`,
          status: stats.social.failed > 0 ? "warning" : "ok",
        },
      ]
    : [];

  const totalJobs = jobs.length;
  const failedJobs = jobs.filter((j) => j.status === "warning").length;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Otomasyon</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Otomatik iş akışlarını yönetin ve izleyin
          </p>
        </div>
        <Button onClick={() => fetchStats(true)} variant="outline" disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Yenile
        </Button>
      </div>

      {/* Summary cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Aktif Görevler</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalJobs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">RSS Bugün</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {loading ? "—" : stats?.rss.collectedToday ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Uyarı</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${failedJobs > 0 ? "text-amber-500" : "text-muted-foreground"}`}>
              {failedJobs}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Son Bir Söz içe aktarma */}
      <Card className="mt-6 border-indigo-500/30 bg-indigo-500/5">
        <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 rounded-lg bg-indigo-500/10 p-2 text-indigo-500">
              <Newspaper className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold">Son Bir Söz&apos;den Haber Çek</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                sonbirsoz.com&apos;daki güncel haberleri (RSS + haber sitemap)
                doğrudan çeker, görsel ve kategorileriyle birlikte yayına ekler.
              </p>
              {importResult && (
                <p className="mt-1 text-xs font-medium text-indigo-500">
                  {importResult}
                </p>
              )}
            </div>
          </div>
          <Button onClick={importSonbirsoz} disabled={importing} className="shrink-0">
            {importing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                İçe aktarılıyor…
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Güncel Haberleri Çek
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Jobs list */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Zamanlanmış Görevler</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Görev</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Zamanlama</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Son Çalışma</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Durum</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">İstatistik</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{job.icon}</span>
                        <div>
                          <p className="font-medium">{job.name}</p>
                          <p className="text-[11px] text-muted-foreground">{job.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <Clock className="mr-1 inline h-3 w-3" />
                      {job.schedule}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatRelative(job.lastRun)}
                    </td>
                    <td className="px-4 py-3">
                      {job.status === "ok" ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600">
                          <CheckCircle className="h-3.5 w-3.5" /> Aktif
                        </span>
                      ) : job.status === "warning" ? (
                        <span className="inline-flex items-center gap-1 text-amber-500">
                          <XCircle className="h-3.5 w-3.5" /> Uyarı
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" /> Bekliyor
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{job.stat}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1.5 text-xs"
                          disabled={triggering === job.id}
                          onClick={() => triggerJob(job.id, job.cronPath)}
                        >
                          {triggering === job.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Zap className="h-3.5 w-3.5" />
                          )}
                          Tetikle
                        </Button>
                        {triggerResults[job.id] && (
                          <span className="text-[10px] text-muted-foreground max-w-[180px] text-right">
                            {triggerResults[job.id]}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <p className="mt-4 text-[11px] text-muted-foreground">
        * Cron görevleri Amplify üzerinden otomatik tetiklenir. &quot;Tetikle&quot; butonu manuel test içindir — CRON_SECRET ortam değişkeni gerektirir.
      </p>
    </div>
  );
}
