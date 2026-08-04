"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, Users } from "lucide-react";

interface Subscriber {
  id: string;
  email: string;
  name: string | null;
  categories: string[];
  isActive: boolean;
  lastSentAt: string | null;
  createdAt: string;
}

type Filter = "all" | "active" | "inactive";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export default function SubscribersPage() {
  const [items, setItems] = useState<Subscriber[]>([]);
  const [total, setTotal] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);

  const limit = 50;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (filter !== "all") params.set("filter", filter);
      const res = await fetch(`/api/admin/subscribers?${params}`);
      if (!res.ok) return;
      const json = await res.json();
      setItems(json.items || []);
      setTotal(json.total || 0);
      setActiveCount(json.activeCount || 0);
    } catch {
      // liste yüklenemedi — mevcut durum korunur
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Bülten Aboneleri</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            E-posta bülteni abonelerini görüntüleyin. Günlük bülten her sabah
            otomatik gönderilir; son dakika haberleri anında iletilir.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(["all", "active", "inactive"] as Filter[]).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setFilter(f);
                setPage(1);
              }}
            >
              {f === "all" ? "Tümü" : f === "active" ? "Aktif" : "İptal Edilen"}
            </Button>
          ))}
        </div>
      </div>

      {/* Özet kartları */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:max-w-md">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Users className="h-8 w-8 text-primary/60" />
            <div>
              <p className="text-2xl font-bold tabular-nums">{activeCount}</p>
              <p className="text-xs text-muted-foreground">Aktif abone</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Mail className="h-8 w-8 text-primary/60" />
            <div>
              <p className="text-2xl font-bold tabular-nums">{total}</p>
              <p className="text-xs text-muted-foreground">Toplam kayıt</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Yükleniyor…
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Abone bulunamadı.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3 font-medium">E-posta</th>
                    <th className="px-4 py-3 font-medium">Ad</th>
                    <th className="hidden px-4 py-3 font-medium lg:table-cell">Kategoriler</th>
                    <th className="px-4 py-3 font-medium">Durum</th>
                    <th className="hidden px-4 py-3 font-medium md:table-cell">Son Gönderim</th>
                    <th className="hidden px-4 py-3 font-medium md:table-cell">Kayıt</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((s) => (
                    <tr key={s.id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="px-4 py-3 font-medium">{s.email}</td>
                      <td className="px-4 py-3 text-muted-foreground">{s.name || "—"}</td>
                      <td className="hidden px-4 py-3 lg:table-cell">
                        {s.categories.length > 0 ? (
                          <span className="text-xs text-muted-foreground">
                            {s.categories.join(", ")}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/50">Genel</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {s.isActive ? (
                          <Badge variant="success">Aktif</Badge>
                        ) : (
                          <Badge variant="secondary">İptal</Badge>
                        )}
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                        {formatDate(s.lastSentAt)}
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                        {formatDate(s.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Önceki
          </Button>
          <span className="text-xs text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Sonraki
          </Button>
        </div>
      )}
    </div>
  );
}
