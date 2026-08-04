"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  XCircle,
  Eye,
  Clock,
  Sparkles,
  User,
  Loader2,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils/format";

interface QueueItem {
  id: string;
  title: string;
  slug: string;
  status: string;
  createdAt: string;
  category: { name: string; slug: string };
  author: { name: string };
}

export default function QueuePage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch drafts and reviews (everything not yet published).
      const [review, draft] = await Promise.all([
        fetch("/api/admin/articles?status=REVIEW").then((r) => r.json()),
        fetch("/api/admin/articles?status=DRAFT").then((r) => r.json()),
      ]);
      const items = [
        ...(Array.isArray(review.data) ? review.data : []),
        ...(Array.isArray(draft.data) ? draft.data : []),
      ];
      setQueue(items);
    } catch {
      setQueue([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function changeStatus(id: string, status: "PUBLISHED" | "ARCHIVED") {
    setBusyId(id);
    try {
      await fetch(`/api/articles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setQueue((prev) => prev.filter((item) => item.id !== id));
      if (selectedId === id) setSelectedId(null);
    } finally {
      setBusyId(null);
    }
  }

  const selectedItem = queue.find((item) => item.id === selectedId);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Onay Kuyruğu</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Taslak ve incelemedeki haberleri onaylayın, düzenleyin veya
            arşivleyin.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            {queue.length} bekleyen
          </Badge>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-5">
        {/* Queue List */}
        <div className="xl:col-span-2 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Yükleniyor...
            </div>
          ) : (
            queue.map((item) => {
              const isAI = item.status === "REVIEW";
              return (
                <Card
                  key={item.id}
                  className={`cursor-pointer transition-all hover:border-primary/50 ${
                    selectedId === item.id
                      ? "border-primary ring-1 ring-primary"
                      : ""
                  }`}
                  onClick={() => setSelectedId(item.id)}
                >
                  <CardContent className="p-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="line-clamp-2 text-sm font-semibold leading-tight">
                        {item.title}
                      </h3>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            item.status === "REVIEW"
                              ? "bg-blue-500/10 text-blue-500"
                              : "bg-amber-500/10 text-amber-600"
                          }`}
                        >
                          {isAI ? (
                            <Sparkles className="h-3 w-3" />
                          ) : (
                            <User className="h-3 w-3" />
                          )}
                          {item.status === "REVIEW" ? "İnceleme" : "Taslak"}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {item.category.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatRelativeTime(item.createdAt)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}

          {!loading && queue.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12">
              <CheckCircle className="h-10 w-10 text-emerald-500" />
              <p className="mt-3 text-sm font-medium">Kuyruk temiz!</p>
              <p className="text-xs text-muted-foreground">
                Bekleyen haber bulunmuyor.
              </p>
            </div>
          )}
        </div>

        {/* Preview Panel */}
        <div className="xl:col-span-3">
          {selectedItem ? (
            <Card className="sticky top-6">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">
                    {selectedItem.category.name}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {selectedItem.author.name}
                  </span>
                </div>

                <h2 className="mt-4 text-xl font-bold">{selectedItem.title}</h2>

                <div className="mt-4 rounded-lg bg-muted/50 p-4 text-sm leading-relaxed text-muted-foreground">
                  Bu haberi yayımlamadan önce içeriğini düzenleme sayfasında
                  inceleyebilirsiniz. Doğrudan onaylayıp yayına alabilir veya
                  arşivleyebilirsiniz.
                </div>

                <div className="mt-6 flex items-center gap-3">
                  <Button
                    className="flex-1"
                    onClick={() => changeStatus(selectedItem.id, "PUBLISHED")}
                    disabled={busyId === selectedItem.id}
                  >
                    {busyId === selectedItem.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                    Onayla ve Yayınla
                  </Button>
                  <Link
                    href={`/admin/haberler/${selectedItem.id}/duzenle`}
                    className="flex-1"
                  >
                    <Button variant="outline" className="w-full">
                      <Eye className="h-4 w-4" />
                      Düzenle
                    </Button>
                  </Link>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => changeStatus(selectedItem.id, "ARCHIVED")}
                    disabled={busyId === selectedItem.id}
                    title="Arşivle"
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="flex h-[400px] items-center justify-center rounded-lg border border-dashed border-border">
              <div className="text-center">
                <Eye className="mx-auto h-10 w-10 text-muted-foreground/50" />
                <p className="mt-3 text-sm text-muted-foreground">
                  İncelemek için soldan bir haber seçin
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
