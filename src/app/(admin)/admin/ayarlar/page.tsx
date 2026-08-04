"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Save, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { SocialStatusPanel } from "@/components/admin/social-status-panel";

interface Settings {
  site_name: string;
  site_description: string;
  contact_email: string;
  meta_title_template: string;
  google_analytics_id: string;
  allow_indexing: boolean;
  social_twitter: string;
  social_instagram: string;
  social_youtube: string;
}

const DEFAULTS: Settings = {
  site_name: "Son Bir Söz",
  site_description: "Doğru, güvenilir ve tarafsız habercilik",
  contact_email: "iletisim@sonbirsoz.com",
  meta_title_template: "%title% | Son Bir Söz",
  google_analytics_id: "",
  allow_indexing: true,
  social_twitter: "@sonbirsoz",
  social_instagram: "@sonbirsoz",
  social_youtube: "@SonBirSoz",
};

type Toast = { type: "success" | "error"; message: string } | null;

export default function AdminAyarlarPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings");
      if (!res.ok) return;
      const json = await res.json();
      const data = json.data as Record<string, unknown>;

      setSettings({
        site_name: String(data.site_name ?? DEFAULTS.site_name),
        site_description: String(data.site_description ?? DEFAULTS.site_description),
        contact_email: String(data.contact_email ?? DEFAULTS.contact_email),
        meta_title_template: String(data.meta_title_template ?? DEFAULTS.meta_title_template),
        google_analytics_id: String(data.google_analytics_id ?? DEFAULTS.google_analytics_id),
        allow_indexing: data.allow_indexing !== false,
        social_twitter: String(data.social_twitter ?? DEFAULTS.social_twitter),
        social_instagram: String(data.social_instagram ?? DEFAULTS.social_instagram),
        social_youtube: String(data.social_youtube ?? DEFAULTS.social_youtube),
      });
    } catch {
      // Defaults remain in place on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast("error", json.error ?? "Kaydedilemedi.");
      } else {
        showToast("success", "Ayarlar başarıyla kaydedildi.");
      }
    } catch {
      showToast("error", "Sunucuya bağlanılamadı.");
    } finally {
      setSaving(false);
    }
  }

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  const inputClass =
    "mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50";

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div
          className={`fixed right-4 top-4 z-50 flex items-center gap-2.5 rounded-xl border px-4 py-3 shadow-lg transition-all ${
            toast.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle className="h-4 w-4 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0" />
          )}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ayarlar</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Site genel ayarlarını yapılandırın
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving || loading}>
          {saving ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-1.5 h-4 w-4" />
          )}
          Değişiklikleri Kaydet
        </Button>
      </div>

      {loading ? (
        <div className="mt-10 flex items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Yükleniyor…
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {/* Genel Bilgiler */}
          <Card>
            <CardHeader>
              <CardTitle>Genel Bilgiler</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Site Adı</label>
                <input
                  className={inputClass}
                  value={settings.site_name}
                  onChange={(e) => set("site_name", e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Açıklama</label>
                <input
                  className={inputClass}
                  value={settings.site_description}
                  onChange={(e) => set("site_description", e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">İletişim E-posta</label>
                <input
                  type="email"
                  className={inputClass}
                  value={settings.contact_email}
                  onChange={(e) => set("contact_email", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* SEO Ayarları */}
          <Card>
            <CardHeader>
              <CardTitle>SEO Ayarları</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Meta Title Şablonu</label>
                <input
                  className={inputClass}
                  value={settings.meta_title_template}
                  onChange={(e) => set("meta_title_template", e.target.value)}
                  placeholder="%title% | Son Bir Söz"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  <code className="rounded bg-muted px-1">%title%</code> sayfa başlığıyla değiştirilir
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">Google Analytics ID</label>
                <input
                  className={inputClass}
                  value={settings.google_analytics_id}
                  onChange={(e) => set("google_analytics_id", e.target.value)}
                  placeholder="G-XXXXXXXXXX"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.allow_indexing}
                  onClick={() => set("allow_indexing", !settings.allow_indexing)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                    settings.allow_indexing ? "bg-primary" : "bg-input"
                  }`}
                >
                  <span
                    className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg transition-transform ${
                      settings.allow_indexing ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
                <label className="text-sm">
                  Arama motorlarına indekslemeye izin ver
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Sosyal Medya Otomasyonu — bağlantı durumu */}
          <SocialStatusPanel />

          {/* Sosyal Medya */}
          <Card>
            <CardHeader>
              <CardTitle>Sosyal Medya</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Twitter (X)</label>
                <input
                  className={inputClass}
                  value={settings.social_twitter}
                  onChange={(e) => set("social_twitter", e.target.value)}
                  placeholder="@sonbirsoz"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Instagram</label>
                <input
                  className={inputClass}
                  value={settings.social_instagram}
                  onChange={(e) => set("social_instagram", e.target.value)}
                  placeholder="@sonbirsoz"
                />
              </div>
              <div>
                <label className="text-sm font-medium">YouTube</label>
                <input
                  className={inputClass}
                  value={settings.social_youtube}
                  onChange={(e) => set("social_youtube", e.target.value)}
                  placeholder="@SonBirSoz"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-1.5 h-4 w-4" />
              )}
              Değişiklikleri Kaydet
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
