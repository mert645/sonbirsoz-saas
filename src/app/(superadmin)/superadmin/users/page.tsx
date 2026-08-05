"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Users,
  Mail,
  Building2,
  Shield,
  Trash2,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  role: string;
}

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
  tenants: Tenant[];
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  EDITOR: "Editör",
  AUTHOR: "Yazar",
};

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "bg-red-500/20 text-red-400",
  ADMIN: "bg-blue-500/20 text-blue-400",
  EDITOR: "bg-green-500/20 text-green-400",
  AUTHOR: "bg-yellow-500/20 text-yellow-400",
};

const TENANT_ROLE_LABELS: Record<string, string> = {
  OWNER: "Sahip",
  ADMIN: "Admin",
  EDITOR: "Editör",
  AUTHOR: "Yazar",
};

export default function SuperAdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (roleFilter) params.set("role", roleFilter);
      params.set("page", page.toString());

      const res = await fetch(`/api/superadmin/users?${params}`);
      const data = await res.json();

      if (res.ok) {
        setUsers(data.users);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, roleFilter, fetchUsers]);

  const handleDelete = async (userId: string) => {
    if (!confirm("Bu kullanıcıyı silmek istediğinize emin misiniz?")) return;

    try {
      const res = await fetch(`/api/superadmin/users?id=${userId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data.error || "Silme işlemi başarısız");
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Bir hata oluştu");
    }
    setActionMenuId(null);
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await fetch("/api/superadmin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });

      if (res.ok) {
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data.error || "Güncelleme başarısız");
      }
    } catch (error) {
      console.error("Error updating user:", error);
      alert("Bir hata oluştu");
    }
    setActionMenuId(null);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Kullanıcı Yönetimi</h1>
        <p className="text-zinc-400">Platformdaki tüm kullanıcıları görüntüle ve yönet</p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="E-posta veya isim ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
        >
          <option value="">Tüm Roller</option>
          <option value="SUPER_ADMIN">Super Admin</option>
          <option value="ADMIN">Admin</option>
          <option value="EDITOR">Editör</option>
          <option value="AUTHOR">Yazar</option>
        </select>
      </div>

      {/* Stats */}
      {pagination && (
        <div className="mb-4 text-sm text-zinc-400">
          Toplam {pagination.total} kullanıcı
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-xs font-medium uppercase text-zinc-500">
              <th className="px-4 py-3">Kullanıcı</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Tenant'lar</th>
              <th className="px-4 py-3">Kayıt Tarihi</th>
              <th className="px-4 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                  Yükleniyor...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                  Kullanıcı bulunamadı
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-zinc-800 last:border-0 hover:bg-zinc-800/50"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-700">
                        {user.role === "SUPER_ADMIN" ? (
                          <Shield className="h-5 w-5 text-red-400" />
                        ) : (
                          <Users className="h-5 w-5 text-zinc-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-white">
                          {user.name || "İsimsiz"}
                        </p>
                        <p className="flex items-center gap-1 text-sm text-zinc-400">
                          <Mail className="h-3 w-3" />
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-1 text-xs font-medium",
                        ROLE_COLORS[user.role] || "bg-zinc-700 text-zinc-300"
                      )}
                    >
                      {ROLE_LABELS[user.role] || user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {user.tenants.length === 0 ? (
                      <span className="text-sm text-zinc-500">-</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {user.tenants.map((tenant) => (
                          <span
                            key={tenant.id}
                            className="inline-flex items-center gap-1 rounded bg-zinc-700 px-2 py-0.5 text-xs"
                            title={`${tenant.name} - ${TENANT_ROLE_LABELS[tenant.role]}`}
                          >
                            <Building2 className="h-3 w-3 text-zinc-400" />
                            {tenant.slug}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-400">
                    {new Date(user.createdAt).toLocaleDateString("tr-TR")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="relative">
                      <button
                        onClick={() =>
                          setActionMenuId(actionMenuId === user.id ? null : user.id)
                        }
                        className="rounded p-1 hover:bg-zinc-700"
                      >
                        <MoreVertical className="h-4 w-4 text-zinc-400" />
                      </button>

                      {actionMenuId === user.id && (
                        <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded-lg border border-zinc-700 bg-zinc-800 py-1 shadow-lg">
                          <div className="px-3 py-2 text-xs font-medium text-zinc-500 uppercase">
                            Rol Değiştir
                          </div>
                          {Object.entries(ROLE_LABELS).map(([role, label]) => (
                            <button
                              key={role}
                              onClick={() => handleRoleChange(user.id, role)}
                              className={cn(
                                "w-full px-3 py-2 text-left text-sm hover:bg-zinc-700",
                                user.role === role
                                  ? "text-red-400"
                                  : "text-zinc-300"
                              )}
                            >
                              {label}
                              {user.role === role && " ✓"}
                            </button>
                          ))}
                          <div className="my-1 border-t border-zinc-700" />
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-400 hover:bg-zinc-700"
                          >
                            <Trash2 className="h-4 w-4" />
                            Kullanıcıyı Sil
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
      {pagination && pagination.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-zinc-400">
            Sayfa {pagination.page} / {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Önceki
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages}
              className="flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white disabled:opacity-50"
            >
              Sonraki
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
