"use client";

import { useState, useEffect } from "react";
import {
  Palette,
  Image as ImageIcon,
  Type,
  Save,
  Loader2,
  Check,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { THEME_PRESETS, PRESET_CATEGORIES, getPresetsByCategory } from "@/lib/theme/presets";
import { getContrastColor } from "@/lib/theme/colors";

interface ThemeSettings {
  theme: {
    primaryColor: string;
    logo: string | null;
    favicon: string | null;
  };
  branding: {
    siteName: string;
    tagline: string;
  };
}

export default function AdminThemePage() {
  const [settings, setSettings] = useState<ThemeSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"colors" | "branding" | "presets">("colors");
  const [selectedCategory, setSelectedCategory] = useState("news");

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/theme");
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (error) {
      console.error("Error fetching theme settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const res = await fetch("/api/admin/theme", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primaryColor: settings.theme.primaryColor,
          logo: settings.theme.logo,
          favicon: settings.theme.favicon,
          siteName: settings.branding.siteName,
          tagline: settings.branding.tagline,
        }),
      });

      if (res.ok) {
        alert("Tema ayarları kaydedildi");
      } else {
        const data = await res.json();
        alert(data.error || "Kaydetme başarısız");
      }
    } catch (error) {
      console.error("Error saving theme:", error);
      alert("Bir hata oluştu");
    } finally {
      setSaving(false);
    }
  };

  const updateTheme = (updates: Partial<ThemeSettings["theme"]>) => {
    if (!settings) return;
    setSettings({
      ...settings,
      theme: { ...settings.theme, ...updates },
    });
  };

  const updateBranding = (updates: Partial<ThemeSettings["branding"]>) => {
    if (!settings) return;
    setSettings({
      ...settings,
      branding: { ...settings.branding, ...updates },
    });
  };

  const applyPreset = (primaryColor: string) => {
    updateTheme({ primaryColor });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Tema ayarları yüklenemedi
      </div>
    );
  }

  const tabs = [
    { id: "colors", name: "Renkler", icon: Palette },
    { id: "branding", name: "Marka", icon: Type },
    { id: "presets", name: "Hazır Temalar", icon: RefreshCw },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tema Ayarları</h1>
          <p className="text-muted-foreground">
            Sitenizin görünümünü özelleştirin
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Kaydet
        </button>
      </div>

      {/* Preview */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">Önizleme</h3>
        <div
          className="rounded-lg border p-6"
          style={{ borderColor: settings.theme.primaryColor }}
        >
          <div className="flex items-center gap-4 mb-4">
            {settings.theme.logo ? (
              <img
                src={settings.theme.logo}
                alt="Logo"
                className="h-12 w-auto"
              />
            ) : (
              <div
                className="h-12 w-12 rounded-lg flex items-center justify-center text-white font-bold text-xl"
                style={{ backgroundColor: settings.theme.primaryColor }}
              >
                {settings.branding.siteName.charAt(0)}
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold">{settings.branding.siteName}</h2>
              {settings.branding.tagline && (
                <p className="text-sm text-muted-foreground">
                  {settings.branding.tagline}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className="rounded-lg px-4 py-2 text-sm font-medium"
              style={{
                backgroundColor: settings.theme.primaryColor,
                color: getContrastColor(settings.theme.primaryColor),
              }}
            >
              Birincil Buton
            </button>
            <button
              className="rounded-lg border px-4 py-2 text-sm font-medium"
              style={{
                borderColor: settings.theme.primaryColor,
                color: settings.theme.primaryColor,
              }}
            >
              İkincil Buton
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors",
              activeTab === tab.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.name}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="rounded-lg border bg-card p-6">
        {activeTab === "colors" && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Ana Renk
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="color"
                  value={settings.theme.primaryColor}
                  onChange={(e) => updateTheme({ primaryColor: e.target.value })}
                  className="h-12 w-12 cursor-pointer rounded-lg border-0"
                />
                <input
                  type="text"
                  value={settings.theme.primaryColor}
                  onChange={(e) => updateTheme({ primaryColor: e.target.value })}
                  className="w-32 rounded-lg border bg-background px-3 py-2 text-sm"
                  placeholder="#000000"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Hızlı Seçim
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  "#EF4444", "#F97316", "#F59E0B", "#10B981",
                  "#14B8A6", "#06B6D4", "#3B82F6", "#6366F1",
                  "#8B5CF6", "#EC4899", "#475569", "#1E3A8A",
                ].map((color) => (
                  <button
                    key={color}
                    onClick={() => updateTheme({ primaryColor: color })}
                    className={cn(
                      "h-10 w-10 rounded-lg border-2 transition-all",
                      settings.theme.primaryColor === color
                        ? "border-foreground scale-110"
                        : "border-transparent hover:scale-105"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "branding" && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Site Adı
              </label>
              <input
                type="text"
                value={settings.branding.siteName}
                onChange={(e) => updateBranding({ siteName: e.target.value })}
                className="w-full max-w-md rounded-lg border bg-background px-4 py-2"
                placeholder="Site Adı"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Slogan
              </label>
              <input
                type="text"
                value={settings.branding.tagline}
                onChange={(e) => updateBranding({ tagline: e.target.value })}
                className="w-full max-w-md rounded-lg border bg-background px-4 py-2"
                placeholder="Kısa bir açıklama"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Logo URL
              </label>
              <input
                type="url"
                value={settings.theme.logo || ""}
                onChange={(e) => updateTheme({ logo: e.target.value || null })}
                className="w-full max-w-md rounded-lg border bg-background px-4 py-2"
                placeholder="https://example.com/logo.png"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Önerilen boyut: 200x50 piksel, PNG veya SVG
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Favicon URL
              </label>
              <input
                type="url"
                value={settings.theme.favicon || ""}
                onChange={(e) => updateTheme({ favicon: e.target.value || null })}
                className="w-full max-w-md rounded-lg border bg-background px-4 py-2"
                placeholder="https://example.com/favicon.ico"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Önerilen boyut: 32x32 piksel, ICO veya PNG
              </p>
            </div>
          </div>
        )}

        {activeTab === "presets" && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Kategori
              </label>
              <div className="flex flex-wrap gap-2">
                {PRESET_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={cn(
                      "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                      selectedCategory === cat.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80"
                    )}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {getPresetsByCategory(selectedCategory).map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset.primaryColor)}
                  className={cn(
                    "rounded-lg border p-4 text-left transition-all hover:shadow-md",
                    settings.theme.primaryColor === preset.primaryColor
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div
                      className="h-8 w-8 rounded-lg"
                      style={{ backgroundColor: preset.primaryColor }}
                    />
                    {settings.theme.primaryColor === preset.primaryColor && (
                      <Check className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <h4 className="font-medium">{preset.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {preset.description}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
