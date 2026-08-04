"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  XCircle,
  ShieldAlert,
  Loader2,
  ExternalLink,
  Bot,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils/format";

interface ModerationItem {
  id: string;
  contentType: string;
  source: string;
  decision: string;
  scores: Record<string, number>;
  maxCategory: string | null;
  maxScore: number | null;
  reason: string | null;
  model: string | null;
  createdAt: string;
  article: {
    id: string;
    title: string;
    slug: string;
    spot: string | null;
    status: string;
    category: { name: string; slug: string } | null;
  } | null;
  comment: { id: string; content: string; status: string } | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  illegal: "Yasa dışı",
  profanity: "Küfür/Hakaret",
  hate: "Nefret söylemi",
  violence: "Şiddet",
  sexual: "Müstehcenlik",
  disinformation: "Dezenformasyon",
};

const SOURCE_LABELS: Record<string, string> = {
  "ai-generate": "AI Üretim",
  import: "İçe Aktarma",
  rss: "RSS",
  comment: "Yorum",
  manual: "Manuel",
};

function scoreColor(score: number): string {
  if (score >= 0.85) return "bg-red-500";
  if (score >= 0.5) return "bg-amber-500";
  return "bg-emerald-500";
}

export default function ModerationQueuePage() {
  const [items, setItems] = useState<ModerationItem[]>([]);
  const [filter, setFilter] = useState<"REVIEW" | "ALL">("REVIEW");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/moderation?decision=${filter}`);
      const json = await res.json();
      setItems(Array.isArray(json.data) ? json.data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function decideItem(id: string, action: "approve" | "reject") {
    setBusyId(id);
    try {
      await fetch(`/api/admin/moderation/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      setItems((prev) => prev.filter((i) => i.id !== id));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI Moderasyon Kuyruğu</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            AI ön-moderasyonun gri bölgeye aldığı içerikleri inceleyin. Skorlar
            0-1 arasıdır; 0.85+ otomatik reddedilir, 0.5 altı otomatik onaylanır.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={filter === "REVIEW" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("REVIEW")}
          >
            Bekleyenler
          </Button>
          <Button
            variant={filter === "ALL" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("ALL")}
          >
            Tümü
          </Button>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Yükleniyor...
          </div>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <ShieldAlert className="h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm font-medium">
                {filter === "REVIEW"
                  ? "İnsan onayı bekleyen içerik yok."
                  : "Henüz moderasyon kaydı yok."}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                AI üretimi ve içe aktarılan içerikler otomatik olarak buradan geçer.
              </p>
            </CardContent>
          </Card>
        ) : (
          items.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={
                          item.decision === "REVIEW"
                            ? "warning"
                            : item.decision === "REJECTED"
                              ? "breaking"
                              : "success"
                        }
                      >
                        {item.decision === "REVIEW"
                          ? "İnceleme Bekliyor"
                          : item.decision === "REJECTED"
                            ? "Reddedildi"
                            : "Onaylandı"}
                      </Badge>
                      <Badge variant="secondary" className="gap-1">
                        <Bot className="h-3 w-3" />
                        {SOURCE_LABELS[item.source] || item.source}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(new Date(item.createdAt))}
                      </span>
                    </div>

                    <h3 className="mt-2 text-sm font-semibold">
                      {item.article?.title ||
                        item.comment?.content?.slice(0, 120) ||
                        "İçerik bulunamadı"}
                    </h3>
                    {item.article?.spot && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {item.article.spot}
                      </p>
                    )}
                    {item.reason && (
                      <p className="mt-2 text-xs italic text-muted-foreground">
                        AI gerekçesi: {item.reason}
                      </p>
                    )}

                    {/* Skor çubukları */}
                    <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-3">
                      {Object.entries(item.scores || {}).map(([cat, score]) => (
                        <div key={cat} className="flex items-center gap-2">
                          <span className="w-28 shrink-0 text-[11px] text-muted-foreground">
                            {CATEGORY_LABELS[cat] || cat}
                          </span>
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                            <div
                              className={`h-full rounded-full ${scoreColor(score)}`}
                              style={{ width: `${Math.round(score * 100)}%` }}
                            />
                          </div>
                          <span className="w-8 text-right text-[11px] tabular-nums text-muted-foreground">
                            {score.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    {item.article && item.article.category && (
                      <Link
                        href={`/admin/haberler/${item.article.id}`}
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Düzenle
                      </Link>
                    )}
                    {item.decision === "REVIEW" && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-emerald-600"
                          disabled={busyId === item.id}
                          onClick={() => decideItem(item.id, "approve")}
                        >
                          {busyId === item.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle className="h-3.5 w-3.5" />
                          )}
                          Onayla
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-red-600"
                          disabled={busyId === item.id}
                          onClick={() => decideItem(item.id, "reject")}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Reddet
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
