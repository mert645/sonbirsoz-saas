"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Palette,
  FolderTree,
  User,
  Check,
  ChevronRight,
  ChevronLeft,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface WizardData {
  // Step 1: Temel Bilgiler
  name: string;
  slug: string;
  // Step 2: Görünüm
  primaryColor: string;
  logo: string;
  // Step 3: Kategoriler
  categoryTemplate: string;
  customCategories: string[];
  // Step 4: Admin Kullanıcı
  adminEmail: string;
  adminName: string;
  adminPassword: string;
}

const CATEGORY_TEMPLATES: Record<string, { name: string; categories: string[] }> = {
  news: {
    name: "Haber Sitesi",
    categories: ["Gündem", "Politika", "Ekonomi", "Dünya", "Spor", "Teknoloji", "Sağlık", "Yaşam"],
  },
  music: {
    name: "Müzik",
    categories: ["Pop", "Rock", "Hip-Hop", "Türk Müziği", "Klasik", "Konserler", "Albümler"],
  },
  sports: {
    name: "Spor",
    categories: ["Futbol", "Basketbol", "Voleybol", "Tenis", "Formula 1", "E-Spor", "Transferler"],
  },
  tech: {
    name: "Teknoloji",
    categories: ["Yazılım", "Donanım", "Mobil", "Oyun", "Yapay Zeka", "Kripto", "Girişimcilik"],
  },
  custom: {
    name: "Özel",
    categories: [],
  },
};

const COLOR_PRESETS = [
  "#EF4444", // Red
  "#F97316", // Orange
  "#F59E0B", // Amber
  "#10B981", // Emerald
  "#14B8A6", // Teal
  "#3B82F6", // Blue
  "#6366F1", // Indigo
  "#8B5CF6", // Violet
  "#EC4899", // Pink
];

const STEPS = [
  { id: 1, name: "Temel Bilgiler", icon: Building2 },
  { id: 2, name: "Görünüm", icon: Palette },
  { id: 3, name: "Kategoriler", icon: FolderTree },
  { id: 4, name: "Admin Kullanıcı", icon: User },
];

export default function TenantOnboardingWizard({
  onComplete,
  onCancel,
}: {
  onComplete: (tenantId: string) => void;
  onCancel: () => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [data, setData] = useState<WizardData>({
    name: "",
    slug: "",
    primaryColor: "#4F46E5",
    logo: "",
    categoryTemplate: "news",
    customCategories: [],
    adminEmail: "",
    adminName: "",
    adminPassword: "",
  });

  const updateData = (updates: Partial<WizardData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/ğ/g, "g")
      .replace(/ü/g, "u")
      .replace(/ş/g, "s")
      .replace(/ı/g, "i")
      .replace(/ö/g, "o")
      .replace(/ç/g, "c")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const validateStep = () => {
    setError("");

    switch (step) {
      case 1:
        if (!data.name.trim()) {
          setError("Tenant adı gerekli");
          return false;
        }
        if (!data.slug.trim()) {
          setError("Slug gerekli");
          return false;
        }
        if (!/^[a-z0-9-]+$/.test(data.slug)) {
          setError("Slug sadece küçük harf, rakam ve tire içerebilir");
          return false;
        }
        break;
      case 3:
        if (data.categoryTemplate === "custom" && data.customCategories.length === 0) {
          setError("En az bir kategori ekleyin");
          return false;
        }
        break;
      case 4:
        if (!data.adminEmail.trim()) {
          setError("Admin e-posta adresi gerekli");
          return false;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.adminEmail)) {
          setError("Geçerli bir e-posta adresi girin");
          return false;
        }
        if (!data.adminPassword || data.adminPassword.length < 8) {
          setError("Şifre en az 8 karakter olmalı");
          return false;
        }
        break;
    }

    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    setStep((s) => Math.min(4, s + 1));
  };

  const handleBack = () => {
    setStep((s) => Math.max(1, s - 1));
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;

    setLoading(true);
    setError("");

    try {
      const categories =
        data.categoryTemplate === "custom"
          ? data.customCategories
          : CATEGORY_TEMPLATES[data.categoryTemplate].categories;

      const res = await fetch("/api/superadmin/tenants/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          slug: data.slug,
          primaryColor: data.primaryColor,
          logo: data.logo || null,
          categories,
          adminEmail: data.adminEmail,
          adminName: data.adminName || null,
          adminPassword: data.adminPassword,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Tenant oluşturulamadı");
      }

      onComplete(result.tenant.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-zinc-900 shadow-2xl">
        {/* Header */}
        <div className="border-b border-zinc-800 p-6">
          <h2 className="text-xl font-bold text-white">Yeni Tenant Oluştur</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Adım adım yeni bir tenant kurulumu yapın
          </p>
        </div>

        {/* Steps */}
        <div className="border-b border-zinc-800 px-6 py-4">
          <div className="flex items-center justify-between">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full",
                    step > s.id
                      ? "bg-green-600"
                      : step === s.id
                      ? "bg-red-600"
                      : "bg-zinc-700"
                  )}
                >
                  {step > s.id ? (
                    <Check className="h-5 w-5 text-white" />
                  ) : (
                    <s.icon className="h-5 w-5 text-white" />
                  )}
                </div>
                <span
                  className={cn(
                    "ml-2 text-sm font-medium",
                    step >= s.id ? "text-white" : "text-zinc-500"
                  )}
                >
                  {s.name}
                </span>
                {i < STEPS.length - 1 && (
                  <ChevronRight className="mx-4 h-5 w-5 text-zinc-600" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Step 1: Temel Bilgiler */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Tenant Adı *
                </label>
                <input
                  type="text"
                  value={data.name}
                  onChange={(e) => {
                    updateData({
                      name: e.target.value,
                      slug: generateSlug(e.target.value),
                    });
                  }}
                  placeholder="Örn: Son Bir Söz Müzik"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Slug (URL) *
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={data.slug}
                    onChange={(e) => updateData({ slug: e.target.value.toLowerCase() })}
                    placeholder="muzik"
                    className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none"
                  />
                  <span className="text-sm text-zinc-500">.sonbirsoz-saas.com</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Görünüm */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Ana Renk
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PRESETS.map((color) => (
                    <button
                      key={color}
                      onClick={() => updateData({ primaryColor: color })}
                      className={cn(
                        "h-10 w-10 rounded-lg border-2 transition-all",
                        data.primaryColor === color
                          ? "border-white scale-110"
                          : "border-transparent"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  <input
                    type="color"
                    value={data.primaryColor}
                    onChange={(e) => updateData({ primaryColor: e.target.value })}
                    className="h-10 w-10 cursor-pointer rounded-lg border-0 bg-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Logo URL (opsiyonel)
                </label>
                <input
                  type="url"
                  value={data.logo}
                  onChange={(e) => updateData({ logo: e.target.value })}
                  placeholder="https://example.com/logo.png"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none"
                />
              </div>
              {/* Preview */}
              <div className="mt-4 rounded-lg border border-zinc-700 p-4">
                <p className="text-xs text-zinc-500 mb-2">Önizleme</p>
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: data.primaryColor }}
                  >
                    <Building2 className="h-5 w-5 text-white" />
                  </div>
                  <span className="font-bold text-white">{data.name || "Tenant Adı"}</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Kategoriler */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Kategori Şablonu
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(CATEGORY_TEMPLATES).map(([key, template]) => (
                    <button
                      key={key}
                      onClick={() => updateData({ categoryTemplate: key })}
                      className={cn(
                        "rounded-lg border p-3 text-left transition-all",
                        data.categoryTemplate === key
                          ? "border-red-500 bg-red-500/10"
                          : "border-zinc-700 hover:border-zinc-600"
                      )}
                    >
                      <p className="font-medium text-white">{template.name}</p>
                      <p className="text-xs text-zinc-400 mt-1">
                        {key === "custom"
                          ? "Kendi kategorilerinizi oluşturun"
                          : `${template.categories.length} kategori`}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {data.categoryTemplate !== "custom" && (
                <div className="rounded-lg border border-zinc-700 p-4">
                  <p className="text-xs text-zinc-500 mb-2">Oluşturulacak Kategoriler</p>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORY_TEMPLATES[data.categoryTemplate].categories.map((cat) => (
                      <span
                        key={cat}
                        className="rounded-full bg-zinc-700 px-3 py-1 text-sm text-white"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {data.categoryTemplate === "custom" && (
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">
                    Özel Kategoriler
                  </label>
                  <input
                    type="text"
                    placeholder="Kategori adı yazıp Enter'a basın"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const value = (e.target as HTMLInputElement).value.trim();
                        if (value && !data.customCategories.includes(value)) {
                          updateData({
                            customCategories: [...data.customCategories, value],
                          });
                          (e.target as HTMLInputElement).value = "";
                        }
                      }
                    }}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none"
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    {data.customCategories.map((cat, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 rounded-full bg-zinc-700 px-3 py-1 text-sm text-white"
                      >
                        {cat}
                        <button
                          onClick={() =>
                            updateData({
                              customCategories: data.customCategories.filter(
                                (_, j) => j !== i
                              ),
                            })
                          }
                          className="ml-1 text-zinc-400 hover:text-white"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Admin Kullanıcı */}
          {step === 4 && (
            <div className="space-y-4">
              <p className="text-sm text-zinc-400 mb-4">
                Bu tenant için ilk admin kullanıcıyı oluşturun. Bu kullanıcı tenant'ın
                sahibi olacak ve tüm yetkilere sahip olacak.
              </p>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  E-posta *
                </label>
                <input
                  type="email"
                  value={data.adminEmail}
                  onChange={(e) => updateData({ adminEmail: e.target.value })}
                  placeholder="admin@example.com"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  İsim (opsiyonel)
                </label>
                <input
                  type="text"
                  value={data.adminName}
                  onChange={(e) => updateData({ adminName: e.target.value })}
                  placeholder="Admin Kullanıcı"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Şifre *
                </label>
                <input
                  type="password"
                  value={data.adminPassword}
                  onChange={(e) => updateData({ adminPassword: e.target.value })}
                  placeholder="En az 8 karakter"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-zinc-800 p-6">
          <button
            onClick={onCancel}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
          >
            İptal
          </button>
          <div className="flex gap-2">
            {step > 1 && (
              <button
                onClick={handleBack}
                className="flex items-center gap-1 rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
              >
                <ChevronLeft className="h-4 w-4" />
                Geri
              </button>
            )}
            {step < 4 ? (
              <button
                onClick={handleNext}
                className="flex items-center gap-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                İleri
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Tenant Oluştur
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
