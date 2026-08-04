"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  CheckCircle,
  XCircle,
  Trash2,
  RefreshCw,
  MessageSquare,
  Loader2,
  Clock,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils/format";

type CommentStatus = "PENDING" | "APPROVED" | "REJECTED";

interface CommentItem {
  id: string;
  content: string;
  status: CommentStatus;
  createdAt: string;
  user: { id: string; name: string; email: string };
  article: {
    id: string;
    title: string;
    slug: string;
    category: { slug: string };
  };
}

const STATUS_CONFIG: Record<
  CommentStatus,
  { label: string; variant: "default" | "secondary" | "warning" | "success" }
> = {
  PENDING: { label: "Bekliyor", variant: "warning" },
  APPROVED: { label: "Onaylandı", variant: "success" },
  REJECTED: { label: "Reddedildi", variant: "secondary" },
};

export default function CommentsPage() {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<CommentStatus | "ALL">("PENDING");

  const fetchComments = useCallback(
    async (showSpinner = false) => {
      if (showSpinner) setRefreshing(true);
      else setLoading(true);
      try {
        const qs = filter !== "ALL" ? `?status=${filter}` : "";
        const res = await fetch(`/api/admin/comments${qs}`);
        const data = await res.json();
        setComments(Array.isArray(data.data) ? data.data : []);
        setTotal(data.total ?? 0);
      } catch {
        setComments([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [filter]
  );

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  async function updateStatus(id: string, status: CommentStatus) {
    setBusyId(id);
    try {
      await fetch(`/api/admin/comments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setComments((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status } : c))
      );
    } finally {
      setBusyId(null);
    }
  }

  async function deleteComment(id: string) {
    if (!confirm("Bu yorumu kalıcı olarak silmek istiyor musunuz?")) return;
    setBusyId(id);
    try {
      await fetch(`/api/admin/comments/${id}`, { method: "DELETE" });
      setComments((prev) => prev.filter((c) => c.id !== id));
      setTotal((t) => t - 1);
    } finally {
      setBusyId(null);
    }
  }

  const filters: { value: CommentStatus | "ALL"; label: string }[] = [
    { value: "ALL", label: "Tümü" },
    { value: "PENDING", label: "Bekleyenler" },
    { value: "APPROVED", label: "Onaylananlar" },
    { value: "REJECTED", label: "Reddedilenler" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Yorum Moderasyonu</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Okuyucu yorumlarını onaylayın veya reddedin.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchComments(true)}
          disabled={refreshing}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
          />
          Yenile
        </Button>
      </div>

      {/* Filtreler */}
      <div className="mt-6 flex gap-2">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              filter === f.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {f.label}
          </button>
        ))}
        <span className="ml-auto flex items-center text-sm text-muted-foreground">
          <Clock className="mr-1 h-3.5 w-3.5" />
          {total} yorum
        </span>
      </div>

      {/* Liste */}
      <div className="mt-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Yükleniyor...
          </div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12">
            <MessageSquare className="h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm font-medium">Yorum bulunamadı</p>
            <p className="text-xs text-muted-foreground">
              Bu filtrede görüntülenecek yorum yok.
            </p>
          </div>
        ) : (
          comments.map((comment) => (
            <Card key={comment.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    {/* Yorum içeriği */}
                    <p className="text-sm leading-relaxed">{comment.content}</p>

                    {/* Meta bilgiler */}
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {comment.user.name}
                      </span>
                      <span>{comment.user.email}</span>
                      <span>{formatRelativeTime(comment.createdAt)}</span>
                      <Link
                        href={`/${comment.article.category.slug}/${comment.article.slug}`}
                        target="_blank"
                        className="text-primary hover:underline"
                      >
                        {comment.article.title}
                      </Link>
                    </div>
                  </div>

                  {/* Durum ve aksiyonlar */}
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge
                      variant={STATUS_CONFIG[comment.status].variant}
                      className="text-xs"
                    >
                      {STATUS_CONFIG[comment.status].label}
                    </Badge>

                    {comment.status !== "APPROVED" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1 px-2 text-xs text-emerald-600 hover:text-emerald-700"
                        disabled={busyId === comment.id}
                        onClick={() => updateStatus(comment.id, "APPROVED")}
                      >
                        {busyId === comment.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <CheckCircle className="h-3 w-3" />
                        )}
                        Onayla
                      </Button>
                    )}

                    {comment.status !== "REJECTED" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1 px-2 text-xs text-amber-600 hover:text-amber-700"
                        disabled={busyId === comment.id}
                        onClick={() => updateStatus(comment.id, "REJECTED")}
                      >
                        {busyId === comment.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        Reddet
                      </Button>
                    )}

                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      disabled={busyId === comment.id}
                      onClick={() => deleteComment(comment.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
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
