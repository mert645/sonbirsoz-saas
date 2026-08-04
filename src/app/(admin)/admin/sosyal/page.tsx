"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Settings,
} from "lucide-react";

type Platform = "TWITTER" | "INSTAGRAM" | "FACEBOOK" | "TELEGRAM" | "YOUTUBE";
type PostStatus = "POSTED" | "SCHEDULED" | "FAILED";

interface SocialPostItem {
  id: string;
  platform: Platform;
  status: PostStatus;
  content: string | null;
  scheduledAt: string | null;
  postedAt: string | null;
  externalId: string | null;
  error: string | null;
  metrics: Record<string, number> | null;
  createdAt: string;
  article: {
    id: string;
    title: string;
    slug: string;
    category: { slug: string };
  };
}

interface PlatformStat {
  platform: Platform;
  _count: { _all: number };
}

interface StatusCount {
  status: PostStatus;
  _count: { _all: number };
}

const PLATFORM_CONFIG: Record<Platform, { label: string; color: string; icon: string }> = {
  TWITTER: { label: "X (Twitter)", color: "bg-sky-500", icon: "𝕏" },
  INSTAGRAM: { label: "Instagram", color: "bg-pink-500", icon: "📷" },
  FACEBOOK: { label: "Facebook", color: "bg-blue-600", icon: "f" },
  TELEGRAM: { label: "Telegram", color: "bg-sky-400", icon: "✈" },
  YOUTUBE: { label: "YouTube", color: "bg-red-600", icon: "▶" },
};

function formatRelative(iso: string | null): string {
  if (!iso) return "-";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "az önce";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} dk önce`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} saat önce`;
  return new Date(iso).toLocaleDateString("tr-TR");
}

function formatScheduled(iso: string | null): string {
  if (!iso) return "-";
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "bekliyor";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} dk sonra`;
  return `${Math.floor(diff / 3_600_000)} saat sonra`;
}

export default function SocialMediaPage() {
  const [posts, setPosts] = useState<SocialPostItem[]>([]);
  const [platformStats, setPlatformStats] = useState<PlatformStat[]>([]);
  const [totalByStatus, setTotalByStatus] = useState<StatusCount[]>([]);
  const [statusFilter, setStatusFilter] = useState<PostStatus | "all">("all");
  const [loading, setLoading] = useState(true);

  const fetchPosts = useCallback(async (status: PostStatus | "all" = "all") => {
    setLoading(true);
    try {
      const url =
        status === "all"
          ? "/api/admin/social"
          : `/api/admin/social?status=${status}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Veri alınamadı");
      const data = await res.json();
      setPosts(data.posts ?? []);
      setPlatformStats(data.platformStats ?? []);
      setTotalByStatus(data.totalByStatus ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts(statusFilter);
  }, [fetchPosts, statusFilter]);

  const countByStatus = (s: PostStatus) =>
    totalByStatus.find((t) => t.status === s)?._count._all ?? 0;

  const platformTodayCount = (p: Platform) =>
    platformStats.find((s) => s.platform === p)?._count._all ?? 0;

  const allPlatforms: Platform[] = ["TWITTER", "INSTAGRAM", "FACEBOOK", "TELEGRAM", "YOUTUBE"];

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sosyal Medya</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Otomatik paylaşımları yönetin ve performansı izleyin.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => fetchPosts(statusFilter)}>
            <RefreshCw className="h-4 w-4" />
            Yenile
          </Button>
          <Button variant="outline">
            <Settings className="h-4 w-4" />
            Platform Ayarları
          </Button>
          <Button>
            <Send className="h-4 w-4" />
            Manuel Paylaş
          </Button>
        </div>
      </div>

      {/* Platform Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {allPlatforms.map((p) => (
          <Card key={p}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-white ${PLATFORM_CONFIG[p].color}`}
                >
                  <span className="text-sm font-bold">{PLATFORM_CONFIG[p].icon}</span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{PLATFORM_CONFIG[p].label}</p>
                  <p className="text-sm font-bold">
                    {platformTodayCount(p)} paylaşım
                  </p>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">bugün gönderildi</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Status summary */}
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Paylaşıldı</p>
            <p className="text-2xl font-bold text-emerald-600">{countByStatus("POSTED")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Zamanlanmış</p>
            <p className="text-2xl font-bold text-blue-600">{countByStatus("SCHEDULED")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Başarısız</p>
            <p className="text-2xl font-bold text-red-600">{countByStatus("FAILED")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="mt-6 flex items-center gap-2">
        {(["all", "POSTED", "SCHEDULED", "FAILED"] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => setStatusFilter(filter)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === filter
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {filter === "all"
              ? "Tümü"
              : filter === "POSTED"
              ? "Paylaşıldı"
              : filter === "SCHEDULED"
              ? "Zamanlanmış"
              : "Başarısız"}
          </button>
        ))}
      </div>

      {/* Posts List */}
      <div className="mt-4 space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="h-16 animate-pulse bg-muted/30 p-4" />
            </Card>
          ))
        ) : posts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Bu filtre için kayıt bulunamadı.
              {statusFilter === "SCHEDULED" && (
                <p className="mt-1 text-xs">
                  Haber yayınlanınca sosyal medya paylaşımları otomatik zamanlanır.
                </p>
              )}
            </CardContent>
          </Card>
        ) : (
          posts.map((post) => (
            <Card key={post.id}>
              <CardContent className="flex items-center gap-4 p-4">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white ${PLATFORM_CONFIG[post.platform].color}`}
                >
                  <span className="text-sm font-bold">
                    {PLATFORM_CONFIG[post.platform].icon}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground">
                      {PLATFORM_CONFIG[post.platform].label}
                    </p>
                    <span className="text-[10px] text-muted-foreground/60">•</span>
                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {post.article.title}
                    </p>
                  </div>
                  <p className="mt-1 line-clamp-1 text-sm">
                    {post.content ?? "İçerik yok"}
                  </p>
                  {post.error && (
                    <p className="mt-0.5 text-[11px] text-red-500 truncate">{post.error}</p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  {post.status === "POSTED" && (
                    <Badge className="gap-1 bg-emerald-500/10 text-emerald-600">
                      <CheckCircle className="h-3 w-3" />
                      {formatRelative(post.postedAt)}
                    </Badge>
                  )}
                  {post.status === "SCHEDULED" && (
                    <Badge className="gap-1 bg-blue-500/10 text-blue-600">
                      <Clock className="h-3 w-3" />
                      {formatScheduled(post.scheduledAt)}
                    </Badge>
                  )}
                  {post.status === "FAILED" && (
                    <Badge className="gap-1 bg-red-500/10 text-red-600">
                      <XCircle className="h-3 w-3" />
                      Başarısız
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
