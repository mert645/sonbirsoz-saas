"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Save,
  Trash2,
  ExternalLink,
  Users,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  UserPlus,
} from "lucide-react";

interface TenantUser {
  role: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    role: string;
    createdAt: string;
  };
}

interface TenantDetail {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  logo: string | null;
  favicon: string | null;
  primaryColor: string;
  plan: "STARTER" | "PROFESSIONAL" | "ENTERPRISE";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  settings: {
    siteName: string | null;
    tagline: string | null;
    aiGenerationEnabled: boolean;
    aiModerationEnabled: boolean;
    videoStudioEnabled: boolean;
    newsletterEnabled: boolean;
    pushEnabled: boolean;
    customDomainEnabled: boolean;
    apiAccessEnabled: boolean;
  } | null;
  subscription: {
    status: string;
    plan: string;
    currentPeriodEnd: string | null;
  } | null;
  _count: {
    articles: number;
    users: number;
    categories: number;
    authors: number;
    media: number;
  };
  users: TenantUser[];
}

export default function TenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<{
    name: string;
    slug: string;
    domain: string;
    plan: "STARTER" | "PROFESSIONAL" | "ENTERPRISE";
    primaryColor: string;
    isActive: boolean;
  }>({
    name: "",
    slug: "",
    domain: "",
    plan: "STARTER",
    primaryColor: "#4F46E5",
    isActive: true,
  });

  useEffect(() => {
    if (!params.id) return;
    
    fetch(`/api/superadmin/tenants/${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setTenant(data.data);
        setForm({
          name: data.data.name,
          slug: data.data.slug,
          domain: data.data.domain || "",
          plan: data.data.plan,
          primaryColor: data.data.primaryColor,
          isActive: data.data.isActive,
        });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [params.id]);

  const handleSave = async () => {
    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/superadmin/tenants/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          domain: form.domain || null,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setTenant(data.data);
      }
    } catch {
      setError("Kaydetme başarısız");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Bu tenant'ı silmek istediğinize emin misiniz?")) return;

    try {
      const res = await fetch(`/api/superadmin/tenants/${params.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        router.push("/superadmin/tenants");
      }
    } catch {
      alert("Silme başarısız");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-500 border-t-transparent" />
      </div>
    );
  }

  if (error && !tenant) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400">{error}</p>
        <Link href="/superadmin/tenants" className="text-zinc-400 hover:text-white mt-4 inline-block">
          ← Geri Dön
        </Link>
      </div>
    );
  }

  if (!tenant) return null;

  const stats = [
    { label: "Makale", value: tenant._count.articles, icon: FileText },
    { label: "Kullanıcı", value: tenant._count.users, icon: Users },
    { label: "Kategori", value: tenant._count.categories, icon: FolderOpen },
    { label: "Medya", value: tenant._count.media, icon: ImageIcon },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/superadmin/tenants"
            className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div
              className="h-12 w-12 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: tenant.primaryColor + "20" }}
            >
              <Building2 className="h-6 w-6" style={{ color: tenant.primaryColor }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{tenant.name}</h1>
              <p className="text-zinc-400">{tenant.slug}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={`http://${tenant.slug}.localhost:3000/admin/dashboard`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-zinc-700 text-sm hover:bg-zinc-800 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            Admin Panele Git
          </a>
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-500/50 text-red-400 text-sm hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Sil
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-zinc-800 bg-zinc-900 p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">{stat.label}</span>
              <stat.icon className="h-4 w-4 text-zinc-500" />
            </div>
            <p className="mt-2 text-2xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Edit Form */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-lg font-semibold mb-4">Tenant Bilgileri</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                Tenant Adı
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white focus:border-red-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                Slug
              </label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) =>
                  setForm({
                    ...form,
                    slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                  })
                }
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white focus:border-red-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                Custom Domain (opsiyonel)
              </label>
              <input
                type="text"
                value={form.domain}
                onChange={(e) => setForm({ ...form, domain: e.target.value })}
                placeholder="ornek.com"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                Plan
              </label>
              <select
                value={form.plan}
                onChange={(e) =>
                  setForm({
                    ...form,
                    plan: e.target.value as "STARTER" | "PROFESSIONAL" | "ENTERPRISE",
                  })
                }
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white focus:border-red-500 focus:outline-none"
              >
                <option value="STARTER">Starter</option>
                <option value="PROFESSIONAL">Professional</option>
                <option value="ENTERPRISE">Enterprise</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                Ana Renk
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.primaryColor}
                  onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                  className="h-10 w-10 rounded border border-zinc-700 bg-zinc-800"
                />
                <input
                  type="text"
                  value={form.primaryColor}
                  onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                  className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white focus:border-red-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isActive"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-red-500 focus:ring-red-500"
              />
              <label htmlFor="isActive" className="text-sm text-zinc-300">
                Aktif
              </label>
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              <Save className="h-4 w-4" />
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>
        </div>

        {/* Users */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Kullanıcılar</h2>
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-700 text-sm hover:bg-zinc-800 transition-colors">
              <UserPlus className="h-4 w-4" />
              Davet Et
            </button>
          </div>
          <div className="space-y-3">
            {tenant.users.length === 0 ? (
              <p className="text-center text-zinc-500 py-4">Henüz kullanıcı yok</p>
            ) : (
              tenant.users.map((tu) => (
                <div
                  key={tu.user.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50"
                >
                  <div>
                    <p className="font-medium">{tu.user.name || tu.user.email}</p>
                    <p className="text-sm text-zinc-500">{tu.user.email}</p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      tu.role === "OWNER"
                        ? "bg-amber-500/20 text-amber-400"
                        : tu.role === "ADMIN"
                        ? "bg-blue-500/20 text-blue-400"
                        : "bg-zinc-500/20 text-zinc-400"
                    }`}
                  >
                    {tu.role}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Features */}
      {tenant.settings && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-lg font-semibold mb-4">Özellikler</h2>
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
            {[
              { key: "aiGenerationEnabled", label: "AI Üretim" },
              { key: "aiModerationEnabled", label: "AI Moderasyon" },
              { key: "videoStudioEnabled", label: "Video Stüdyo" },
              { key: "newsletterEnabled", label: "Newsletter" },
              { key: "pushEnabled", label: "Push Bildirim" },
              { key: "customDomainEnabled", label: "Custom Domain" },
              { key: "apiAccessEnabled", label: "API Erişimi" },
            ].map((feature) => (
              <div
                key={feature.key}
                className={`flex items-center gap-2 p-3 rounded-lg ${
                  tenant.settings![feature.key as keyof typeof tenant.settings]
                    ? "bg-green-500/10 text-green-400"
                    : "bg-zinc-800 text-zinc-500"
                }`}
              >
                <div
                  className={`h-2 w-2 rounded-full ${
                    tenant.settings![feature.key as keyof typeof tenant.settings]
                      ? "bg-green-500"
                      : "bg-zinc-600"
                  }`}
                />
                {feature.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
