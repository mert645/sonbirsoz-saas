"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Save, Loader2, CheckCircle, AlertTriangle, Building2 } from "lucide-react";
import { SocialStatusPanel } from "@/components/admin/social-status-panel";

interface TenantSettings {
  siteName: string;
  tagline: string;
  defaultSeoTitle: string;
  defaultSeoDescription: string;
  googleAnalyticsId: string;
  socialLinks: {
    twitter?: string;
    instagram?: string;
    facebook?: string;
    youtube?: string;
  };
}

interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  plan: string;
  primaryColor: string;
}

const DEFAULTS: TenantSettings = {
  siteName: "",
  tagline: "",
  defaultSeoTitle: "",
  defaultSeoDescription: "",
  googleAnalyticsId: "",
  socialLinks: {},
};

type Toast = { type: "success" | "error"; message: string } | null;

export default function AdminAyarlarPage() {
  const [settings, setSettings] = useState<TenantSettings>(DEFAULTS);
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
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
      const [settingsRes, tenantRes] = await Promise.all([
        fetch("/api/admin/settings"),
        fetch("/api/admin/tenant"),
      ]);

      if (settingsRes.ok) {
        const json = await settingsRes.json();
        const data = json.data || {};
        setSettings({
          siteName: data.siteName || "",
          tagline: data.tagline || "",
          defaultSeoTitle: data.defaultSeoTitle || "",
          defaultSeoDescription: data.defaultSeoDescription || "",
          googleAnalyticsId: data.googleAnalyticsId || "",
          socialLinks: data.socialLinks || {},
        });
      }

      if (tenantRes.ok) {
        const json = await tenantRes.json();
        if (json.data) setTenant(json.data);
      }
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

  function set<K extends keyof TenantSettings>(key: K, value: TenantSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function setSocialLink(key: string, value: string) {
    setSettings((prev) => ({
      ...prev,
      socialLinks: { ...prev.socialLinks, [key]: value },
    }));
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
          {/* Tenant Bilgileri */}
          {tenant && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Tenant Bilgileri
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-lg border bg-muted/50 p-4">
                    <p className="text-sm text-muted-foreground">Tenant Adı</p>
                    <p className="font-medium">{tenant.name}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/50 p-4">
                    <p className="text-sm text-muted-foreground">Slug</p>
                    <p className="font-medium">{tenant.slug}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/50 p-4">
                    <p className="text-sm text-muted-foreground">Plan</p>
                    <p className="font-medium">{tenant.plan}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

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
                  value={settings.siteName}
                  onChange={(e) => set("siteName", e.target.value)}
                  placeholder={tenant?.name || "Site adı"}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Slogan</label>
                <input
                  className={inputClass}
                  value={settings.tagline}
                  onChange={(e) => set("tagline", e.target.value)}
                  placeholder="Doğru, güvenilir ve tarafsız habercilik"
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
                <label className="text-sm font-medium">Varsayılan SEO Başlığı</label>
                <input
                  className={inputClass}
                  value={settings.defaultSeoTitle}
                  onChange={(e) => set("defaultSeoTitle", e.target.value)}
                  placeholder="Site Adı | Slogan"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Varsayılan SEO Açıklaması</label>
                <textarea
                  className={inputClass}
                  rows={3}
                  value={settings.defaultSeoDescription}
                  onChange={(e) => set("defaultSeoDescription", e.target.value)}
                  placeholder="Sitenizin kısa açıklaması..."
                />
              </div>
              <div>
                <label className="text-sm font-medium">Google Analytics ID</label>
                <input
                  className={inputClass}
                  value={settings.googleAnalyticsId}
                  onChange={(e) => set("googleAnalyticsId", e.target.value)}
                  placeholder="G-XXXXXXXXXX"
                />
              </div>
            </CardContent>
          </Card>

          {/* Sosyal Medya Otomasyonu — bağlantı durumu */}
          <SocialStatusPanel />

          {/* Sosyal Medya */}
          <Card>
            <CardHeader>
              <CardTitle>Sosyal Medya Linkleri</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Twitter (X)</label>
                <input
                  className={inputClass}
                  value={settings.socialLinks.twitter || ""}
                  onChange={(e) => setSocialLink("twitter", e.target.value)}
                  placeholder="https://twitter.com/hesabiniz"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Instagram</label>
                <input
                  className={inputClass}
                  value={settings.socialLinks.instagram || ""}
                  onChange={(e) => setSocialLink("instagram", e.target.value)}
                  placeholder="https://instagram.com/hesabiniz"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Facebook</label>
                <input
                  className={inputClass}
                  value={settings.socialLinks.facebook || ""}
                  onChange={(e) => setSocialLink("facebook", e.target.value)}
                  placeholder="https://facebook.com/sayfaniz"
                />
              </div>
              <div>
                <label className="text-sm font-medium">YouTube</label>
                <input
                  className={inputClass}
                  value={settings.socialLinks.youtube || ""}
                  onChange={(e) => setSocialLink("youtube", e.target.value)}
                  placeholder="https://youtube.com/@kanaliniz"
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
