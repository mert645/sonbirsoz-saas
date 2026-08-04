"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, Trash2, Eye, Loader2, Send } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils/format";

type ArticleStatus =
  | "PUBLISHED"
  | "DRAFT"
  | "REVIEW"
  | "ARCHIVED"
  | "REJECTED";

interface AdminArticle {
  id: string;
  title: string;
  slug: string;
  status: ArticleStatus;
  publishedAt: string | null;
  viewCount: number;
  createdAt: string;
  category: { name: string; slug: string };
  author: { name: string };
}

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  PUBLISHED: { label: "Yayında", className: "bg-emerald-500/10 text-emerald-600" },
  DRAFT: { label: "Taslak", className: "bg-amber-500/10 text-amber-600" },
  REVIEW: { label: "İnceleme", className: "bg-blue-500/10 text-blue-600" },
  ARCHIVED: { label: "Arşiv", className: "bg-zinc-500/10 text-zinc-500" },
  REJECTED: { label: "Reddedildi", className: "bg-red-500/10 text-red-600" },
};

export default function AdminArticlesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [articles, setArticles] = useState<AdminArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      const res = await fetch(`/api/admin/articles?${params.toString()}`);
      const json = await res.json();
      setArticles(Array.isArray(json.data) ? json.data : []);
    } catch {
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery, load]);

  async function publish(id: string) {
    setBusyId(id);
    try {
      await fetch(`/api/articles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PUBLISHED" }),
      });
      await load(searchQuery);
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    if (!confirm("Bu haberi silmek istediğinize emin misiniz?")) return;
    setBusyId(id);
    try {
      await fetch(`/api/articles/${id}`, { method: "DELETE" });
      await load(searchQuery);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Haberler</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tüm haberleri yönetin, düzenleyin ve yayınlayın.
          </p>
        </div>
        <Link href="/admin/haberler/yeni">
          <Button>
            <Plus className="h-4 w-4" />
            Yeni Haber
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="mt-6 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Haber ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-border bg-background py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Articles Table */}
      <Card className="mt-6">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Yükleniyor...
            </div>
          ) : articles.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              Henüz haber yok. İlk haberinizi oluşturmak için &ldquo;Yeni
              Haber&rdquo;e tıklayın.
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Başlık
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Kategori
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Yazar
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Durum
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Görüntülenme
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    İşlem
                  </th>
                </tr>
              </thead>
              <tbody>
                {articles.map((article) => (
                  <tr
                    key={article.id}
                    className="border-b border-border last:border-0 hover:bg-muted/50"
                  >
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium">{article.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {article.publishedAt
                          ? formatRelativeTime(article.publishedAt)
                          : formatRelativeTime(article.createdAt)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="category">{article.category.name}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {article.author.name}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          STATUS_MAP[article.status]?.className ??
                          "bg-muted text-muted-foreground"
                        }`}
                      >
                        {STATUS_MAP[article.status]?.label ?? article.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {article.viewCount > 0
                        ? article.viewCount.toLocaleString("tr-TR")
                        : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {article.status !== "PUBLISHED" && (
                          <button
                            onClick={() => publish(article.id)}
                            disabled={busyId === article.id}
                            title="Yayınla"
                            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-emerald-600 disabled:opacity-50"
                          >
                            {busyId === article.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                          </button>
                        )}
                        <Link
                          href={`/${article.category.slug}/${article.slug}`}
                          target="_blank"
                          className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                          title="Görüntüle"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/admin/haberler/${article.id}/duzenle`}
                          className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                          title="Düzenle"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => remove(article.id)}
                          disabled={busyId === article.id}
                          className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive disabled:opacity-50"
                          title="Sil"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
