"use client";

import { useState, useEffect } from "react";
import {
  Settings,
  Globe,
  Mail,
  Shield,
  CreditCard,
  Cloud,
  Sparkles,
  BarChart3,
  Check,
  X,
  Loader2,
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PlatformSettings {
  platform: {
    name: string;
    domain: string;
    supportEmail: string;
    logoUrl: string | null;
  };
  features: {
    allowSignup: boolean;
    requireEmailVerification: boolean;
    maintenanceMode: boolean;
  };
  limits: {
    maxTenantsPerUser: number;
    trialDays: number;
  };
  integrations: {
    stripeConfigured: boolean;
    awsConfigured: boolean;
    openaiConfigured: boolean;
    googleAnalyticsId: string | null;
  };
  email: {
    provider: string;
    fromAddress: string | null;
  };
}

interface Stats {
  totalTenants: number;
  totalUsers: number;
  totalArticles: number;
}

export default function SuperAdminSettingsPage() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/superadmin/settings");
      const data = await res.json();
      if (res.ok) {
        setSettings(data.settings);
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/superadmin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || "Ayarlar kaydedildi");
      } else {
        alert(data.error || "Kaydetme başarısız");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Bir hata oluştu");
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: "general", name: "Genel", icon: Settings },
    { id: "features", name: "Özellikler", icon: Sparkles },
    { id: "integrations", name: "Entegrasyonlar", icon: Cloud },
    { id: "email", name: "E-posta", icon: Mail },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-red-500" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center py-12 text-zinc-500">
        Ayarlar yüklenemedi
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Platform Ayarları</h1>
          <p className="text-zinc-400">SaaS platformunun genel ayarlarını yönetin</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Kaydet
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="mb-6 grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-sm text-zinc-400">Toplam Tenant</p>
            <p className="text-2xl font-bold">{stats.totalTenants}</p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-sm text-zinc-400">Toplam Kullanıcı</p>
            <p className="text-2xl font-bold">{stats.totalUsers}</p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-sm text-zinc-400">Toplam Makale</p>
            <p className="text-2xl font-bold">{stats.totalArticles}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-zinc-800">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors",
              activeTab === tab.id
                ? "border-red-500 text-white"
                : "border-transparent text-zinc-400 hover:text-white"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.name}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
        {activeTab === "general" && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Platform Adı
              </label>
              <input
                type="text"
                value={settings.platform.name}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    platform: { ...settings.platform, name: e.target.value },
                  })
                }
                className="w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white focus:border-red-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Ana Domain
              </label>
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  value={settings.platform.domain}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      platform: { ...settings.platform, domain: e.target.value },
                    })
                  }
                  className="w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white focus:border-red-500 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Destek E-postası
              </label>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-zinc-500" />
                <input
                  type="email"
                  value={settings.platform.supportEmail}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      platform: { ...settings.platform, supportEmail: e.target.value },
                    })
                  }
                  className="w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white focus:border-red-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="pt-4 border-t border-zinc-800">
              <h3 className="text-sm font-medium text-white mb-4">Limitler</h3>
              <div className="grid grid-cols-2 gap-4 max-w-md">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">
                    Kullanıcı Başına Max Tenant
                  </label>
                  <input
                    type="number"
                    value={settings.limits.maxTenantsPerUser}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        limits: {
                          ...settings.limits,
                          maxTenantsPerUser: parseInt(e.target.value) || 1,
                        },
                      })
                    }
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white focus:border-red-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">
                    Deneme Süresi (gün)
                  </label>
                  <input
                    type="number"
                    value={settings.limits.trialDays}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        limits: {
                          ...settings.limits,
                          trialDays: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white focus:border-red-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "features" && (
          <div className="space-y-4">
            <ToggleSetting
              label="Yeni Kayıtlara İzin Ver"
              description="Yeni kullanıcıların platforma kaydolmasına izin ver"
              checked={settings.features.allowSignup}
              onChange={(checked) =>
                setSettings({
                  ...settings,
                  features: { ...settings.features, allowSignup: checked },
                })
              }
            />
            <ToggleSetting
              label="E-posta Doğrulama Zorunlu"
              description="Kullanıcıların e-posta adreslerini doğrulamasını zorunlu kıl"
              checked={settings.features.requireEmailVerification}
              onChange={(checked) =>
                setSettings({
                  ...settings,
                  features: { ...settings.features, requireEmailVerification: checked },
                })
              }
            />
            <ToggleSetting
              label="Bakım Modu"
              description="Platformu bakım moduna al (sadece Super Admin erişebilir)"
              checked={settings.features.maintenanceMode}
              onChange={(checked) =>
                setSettings({
                  ...settings,
                  features: { ...settings.features, maintenanceMode: checked },
                })
              }
              danger
            />
          </div>
        )}

        {activeTab === "integrations" && (
          <div className="space-y-4">
            <IntegrationStatus
              name="Stripe"
              description="Ödeme işlemleri için"
              icon={CreditCard}
              configured={settings.integrations.stripeConfigured}
            />
            <IntegrationStatus
              name="AWS S3"
              description="Medya depolama için"
              icon={Cloud}
              configured={settings.integrations.awsConfigured}
            />
            <IntegrationStatus
              name="OpenAI"
              description="AI içerik üretimi için"
              icon={Sparkles}
              configured={settings.integrations.openaiConfigured}
            />
            <div className="pt-4 border-t border-zinc-800">
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Google Analytics ID
              </label>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  value={settings.integrations.googleAnalyticsId || ""}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      integrations: {
                        ...settings.integrations,
                        googleAnalyticsId: e.target.value || null,
                      },
                    })
                  }
                  placeholder="G-XXXXXXXXXX"
                  className="w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === "email" && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                E-posta Sağlayıcı
              </label>
              <select
                value={settings.email.provider}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    email: { ...settings.email, provider: e.target.value },
                  })
                }
                className="w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white focus:border-red-500 focus:outline-none"
              >
                <option value="none">Yapılandırılmamış</option>
                <option value="ses">Amazon SES</option>
                <option value="sendgrid">SendGrid</option>
                <option value="resend">Resend</option>
                <option value="smtp">SMTP</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Gönderen Adresi
              </label>
              <input
                type="email"
                value={settings.email.fromAddress || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    email: { ...settings.email, fromAddress: e.target.value || null },
                  })
                }
                placeholder="noreply@sonbirsoz-saas.com"
                className="w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ToggleSetting({
  label,
  description,
  checked,
  onChange,
  danger = false,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-zinc-800 last:border-0">
      <div>
        <p className={cn("font-medium", danger && "text-red-400")}>{label}</p>
        <p className="text-sm text-zinc-500">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 rounded-full transition-colors",
          checked
            ? danger
              ? "bg-red-600"
              : "bg-green-600"
            : "bg-zinc-700"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
            checked ? "left-[22px]" : "left-0.5"
          )}
        />
      </button>
    </div>
  );
}

function IntegrationStatus({
  name,
  description,
  icon: Icon,
  configured,
}: {
  name: string;
  description: string;
  icon: React.ElementType;
  configured: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-zinc-800 last:border-0">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg",
            configured ? "bg-green-500/20" : "bg-zinc-700"
          )}
        >
          <Icon
            className={cn("h-5 w-5", configured ? "text-green-400" : "text-zinc-400")}
          />
        </div>
        <div>
          <p className="font-medium">{name}</p>
          <p className="text-sm text-zinc-500">{description}</p>
        </div>
      </div>
      <div
        className={cn(
          "flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium",
          configured
            ? "bg-green-500/20 text-green-400"
            : "bg-zinc-700 text-zinc-400"
        )}
      >
        {configured ? (
          <>
            <Check className="h-3 w-3" />
            Yapılandırıldı
          </>
        ) : (
          <>
            <X className="h-3 w-3" />
            Yapılandırılmadı
          </>
        )}
      </div>
    </div>
  );
}
