"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, PlugZap, CheckCircle2, XCircle, Clock } from "lucide-react";

interface LastPost {
  status: string;
  postedAt: string | null;
  scheduledAt: string | null;
  error: string | null;
  articleTitle: string | null;
}

interface PlatformStatus {
  platform: string;
  label: string;
  configured: boolean;
  missingKeys: string[];
  lastPost: LastPost | null;
}

const POST_STATUS_LABELS: Record<string, string> = {
  POSTED: "Gönderildi",
  SCHEDULED: "Zamanlandı",
  FAILED: "Başarısız",
  DRAFT: "Taslak",
};

function formatTime(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("tr-TR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

/** Sosyal hesap bağlantı durumu paneli (admin > Ayarlar). */
export function SocialStatusPanel() {
  const [items, setItems] = useState<PlatformStatus[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/social-status")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((json) => {
        if (!cancelled) setItems(json.items || []);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PlugZap className="h-4 w-4" />
          Sosyal Hesap Bağlantı Durumu
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error ? (
          <p className="text-sm text-muted-foreground">
            Durum bilgisi alınamadı.
          </p>
        ) : !items ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Yükleniyor…
          </div>
        ) : (
          <div className="divide-y">
            {items.map((item) => (
              <div
                key={item.platform}
                className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="flex items-center gap-2.5">
                  {item.configured ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  ) : (
                    <XCircle className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                  )}
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    {!item.configured && (
                      <p className="text-[11px] text-muted-foreground">
                        Eksik: {item.missingKeys.join(", ")}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {item.configured ? (
                    <Badge variant="success">Bağlı</Badge>
                  ) : (
                    <Badge variant="secondary">Yapılandırılmadı</Badge>
                  )}
                  {item.lastPost && (
                    <span
                      className="flex items-center gap-1 text-[11px] text-muted-foreground"
                      title={
                        item.lastPost.error ||
                        item.lastPost.articleTitle ||
                        undefined
                      }
                    >
                      <Clock className="h-3 w-3" />
                      Son gönderi:{" "}
                      {POST_STATUS_LABELS[item.lastPost.status] ||
                        item.lastPost.status}
                      {item.lastPost.postedAt &&
                        ` · ${formatTime(item.lastPost.postedAt)}`}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="mt-4 text-[11px] text-muted-foreground">
          Platform token&apos;ları Amplify ortam değişkenleriyle yönetilir.
          Yapılandırılan platformlara yayınlanan her haber otomatik gönderilir
          (X/Telegram anında; Facebook +5 dk, Instagram +15 dk kademeli).
        </p>
      </CardContent>
    </Card>
  );
}
