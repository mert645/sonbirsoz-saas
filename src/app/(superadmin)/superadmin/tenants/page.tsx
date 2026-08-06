"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Building2,
  Plus,
  Search,
  MoreVertical,
  ExternalLink,
  Edit,
  Trash2,
  Power,
  PowerOff,
  Wand2,
} from "lucide-react";
import TenantOnboardingWizard from "@/components/superadmin/TenantOnboardingWizard";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  plan: "STARTER" | "PROFESSIONAL" | "ENTERPRISE";
  isActive: boolean;
  primaryColor: string;
  createdAt: string;
  _count: {
    articles: number;
    users: number;
    categories: number;
  };
  subscription: {
    status: string;
    currentPeriodEnd: string;
  } | null;
}

interface TenantsResponse {
  data: Tenant[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [actionMenu, setActionMenu] = useState<string | null>(null);

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", page.toString());
    if (search) params.set("search", search);
    if (planFilter) params.set("plan", planFilter);
    if (statusFilter) params.set("status", statusFilter);

    try {
      const res = await fetch(`/api/superadmin/tenants?${params}`);
      const data: TenantsResponse = await res.json();
      setTenants(data.data || []);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error("Tenant fetch error:", error);
    } finally {
      setLoading(false);
    }
  }, [page, search, planFilter, statusFilter]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const toggleTenantStatus = async (tenant: Tenant) => {
    try {
      await fetch(`/api/superadmin/tenants/${tenant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !tenant.isActive }),
      });
      fetchTenants();
    } catch (error) {
      console.error("Toggle status error:", error);
    }
    setActionMenu(null);
  };

  const deleteTenant = async (tenant: Tenant) => {
    if (!confirm(`"${tenant.name}" tenant'ını silmek istediğinize emin misiniz?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/superadmin/tenants/${tenant.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        fetchTenants();
      }
    } catch (error) {
      console.error("Delete error:", error);
    }
    setActionMenu(null);
  };

  const planBadgeClass: Record<string, string> = {
    STARTER: "bg-zinc-500/20 text-zinc-400",
    PROFESSIONAL: "bg-blue-500/20 text-blue-400",
    ENTERPRISE: "bg-amber-500/20 text-amber-400",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tenant Yönetimi</h1>
          <p className="text-zinc-400">Tüm tenant'ları görüntüle ve yönet</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Hızlı Oluştur
          </button>
          <button
            onClick={() => setShowWizard(true)}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
          >
            <Wand2 className="h-4 w-4" />
            Kurulum Sihirbazı
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Ara..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none"
          />
        </div>
        <select
          value={planFilter}
          onChange={(e) => {
            setPlanFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
        >
          <option value="">Tüm Planlar</option>
          <option value="STARTER">Starter</option>
          <option value="PROFESSIONAL">Professional</option>
          <option value="ENTERPRISE">Enterprise</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
        >
          <option value="">Tüm Durumlar</option>
          <option value="active">Aktif</option>
          <option value="inactive">Pasif</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 overflow-hidden">
        <table className="w-full">
          <thead className="bg-zinc-800/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                Tenant
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                Plan
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                Durum
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                İstatistikler
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                Oluşturulma
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase">
                İşlemler
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                  <div className="flex items-center justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
                  </div>
                </td>
              </tr>
            ) : tenants.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                  Tenant bulunamadı
                </td>
              </tr>
            ) : (
              tenants.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-zinc-800/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-10 w-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: tenant.primaryColor + "20" }}
                      >
                        <Building2
                          className="h-5 w-5"
                          style={{ color: tenant.primaryColor }}
                        />
                      </div>
                      <div>
                        <p className="font-medium">{tenant.name}</p>
                        <p className="text-sm text-zinc-500">{tenant.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-1 rounded ${planBadgeClass[tenant.plan]}`}
                    >
                      {tenant.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        tenant.isActive
                          ? "bg-green-500/20 text-green-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {tenant.isActive ? "Aktif" : "Pasif"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-400">
                    {tenant._count.articles} makale · {tenant._count.users} kullanıcı
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-400">
                    {new Date(tenant.createdAt).toLocaleDateString("tr-TR")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="relative">
                      <button
                        onClick={() =>
                          setActionMenu(actionMenu === tenant.id ? null : tenant.id)
                        }
                        className="p-1 rounded hover:bg-zinc-700"
                      >
                        <MoreVertical className="h-4 w-4 text-zinc-400" />
                      </button>
                      {actionMenu === tenant.id && (
                        <div className="absolute right-0 top-8 z-10 w-48 rounded-lg border border-zinc-700 bg-zinc-800 py-1 shadow-lg">
                          <Link
                            href={`/superadmin/tenants/${tenant.id}`}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
                          >
                            <Edit className="h-4 w-4" />
                            Düzenle
                          </Link>
                          <a
                            href={`http://${tenant.slug}.localhost:3000/admin/dashboard`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Admin Panele Git
                          </a>
                          <button
                            onClick={() => toggleTenantStatus(tenant)}
                            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
                          >
                            {tenant.isActive ? (
                              <>
                                <PowerOff className="h-4 w-4" />
                                Deaktif Et
                              </>
                            ) : (
                              <>
                                <Power className="h-4 w-4" />
                                Aktif Et
                              </>
                            )}
                          </button>
                          <hr className="my-1 border-zinc-700" />
                          <button
                            onClick={() => deleteTenant(tenant)}
                            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-zinc-700"
                          >
                            <Trash2 className="h-4 w-4" />
                            Sil
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 rounded border border-zinc-700 text-sm disabled:opacity-50"
          >
            Önceki
          </button>
          <span className="text-sm text-zinc-400">
            Sayfa {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 rounded border border-zinc-700 text-sm disabled:opacity-50"
          >
            Sonraki
          </button>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateTenantModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            fetchTenants();
          }}
        />
      )}

      {/* Onboarding Wizard */}
      {showWizard && (
        <TenantOnboardingWizard
          onComplete={() => {
            setShowWizard(false);
            fetchTenants();
          }}
          onCancel={() => setShowWizard(false)}
        />
      )}
    </div>
  );
}

function CreateTenantModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<{
    name: string;
    slug: string;
    plan: "STARTER" | "PROFESSIONAL" | "ENTERPRISE";
    primaryColor: string;
  }>({
    name: "",
    slug: "",
    plan: "STARTER",
    primaryColor: "#4F46E5",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/superadmin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        onCreated();
      }
    } catch {
      setError("Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-900 p-6">
        <h2 className="text-xl font-bold mb-4">Yeni Tenant Oluştur</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">
              Tenant Adı
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => {
                setForm({ ...form, name: e.target.value });
                if (!form.slug) {
                  setForm((f) => ({
                    ...f,
                    name: e.target.value,
                    slug: e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, "-")
                      .replace(/^-|-$/g, ""),
                  }));
                }
              }}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white focus:border-red-500 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">
              Slug (URL)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={form.slug}
                onChange={(e) =>
                  setForm({
                    ...form,
                    slug: e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9-]+/g, ""),
                  })
                }
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white focus:border-red-500 focus:outline-none"
                required
              />
              <span className="text-zinc-500 text-sm">.sonbirsoz-saas.com</span>
            </div>
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
          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-zinc-400 hover:text-white"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-red-600 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? "Oluşturuluyor..." : "Oluştur"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
