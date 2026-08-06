"use client";

import { useEffect, useState } from "react";
import {
  Users,
  UserPlus,
  Mail,
  Clock,
  MoreVertical,
  Trash2,
  Shield,
  X,
} from "lucide-react";

interface TenantUser {
  id: string;
  role: string;
  isActive: boolean;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    createdAt: string;
  };
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [actionMenu, setActionMenu] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (!data.error) {
        setUsers(data.users || []);
        setInvitations(data.invitations || []);
      }
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const roleLabels: Record<string, { label: string; className: string }> = {
    OWNER: { label: "Sahip", className: "bg-amber-500/10 text-amber-600" },
    ADMIN: { label: "Yönetici", className: "bg-blue-500/10 text-blue-600" },
    EDITOR: { label: "Editör", className: "bg-green-500/10 text-green-600" },
    AUTHOR: { label: "Yazar", className: "bg-zinc-500/10 text-zinc-600" },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kullanıcılar</h1>
          <p className="text-muted-foreground">Ekip üyelerini yönetin</p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          Davet Et
        </button>
      </div>

      {/* Active Users */}
      <div className="rounded-lg border bg-card">
        <div className="border-b px-4 py-3">
          <h2 className="font-semibold flex items-center gap-2">
            <Users className="h-4 w-4" />
            Aktif Kullanıcılar ({users.length})
          </h2>
        </div>
        <div className="divide-y">
          {users.length === 0 ? (
            <div className="px-4 py-8 text-center text-muted-foreground">
              Henüz kullanıcı yok
            </div>
          ) : (
            users.map((tu) => (
              <div
                key={tu.id}
                className="flex items-center justify-between px-4 py-3 hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    {tu.user.image ? (
                      <img
                        src={tu.user.image}
                        alt=""
                        className="h-10 w-10 rounded-full"
                      />
                    ) : (
                      <span className="text-sm font-medium text-primary">
                        {(tu.user.name || tu.user.email)[0].toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-medium">
                      {tu.user.name || tu.user.email.split("@")[0]}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {tu.user.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      roleLabels[tu.role]?.className || "bg-zinc-100"
                    }`}
                  >
                    {roleLabels[tu.role]?.label || tu.role}
                  </span>
                  <div className="relative">
                    <button
                      onClick={() =>
                        setActionMenu(actionMenu === tu.id ? null : tu.id)
                      }
                      className="p-1 rounded hover:bg-muted"
                    >
                      <MoreVertical className="h-4 w-4 text-muted-foreground" />
                    </button>
                    {actionMenu === tu.id && (
                      <div className="absolute right-0 top-8 z-10 w-40 rounded-lg border bg-card py-1 shadow-lg">
                        <button className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-muted">
                          <Shield className="h-4 w-4" />
                          Rol Değiştir
                        </button>
                        <button className="flex w-full items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-muted">
                          <Trash2 className="h-4 w-4" />
                          Kaldır
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="rounded-lg border bg-card">
          <div className="border-b px-4 py-3">
            <h2 className="font-semibold flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Bekleyen Davetler ({invitations.length})
            </h2>
          </div>
          <div className="divide-y">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">{inv.email}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(inv.expiresAt) > new Date()
                        ? `${Math.ceil(
                            (new Date(inv.expiresAt).getTime() - Date.now()) /
                              (1000 * 60 * 60 * 24)
                          )} gün kaldı`
                        : "Süresi dolmuş"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      roleLabels[inv.role]?.className || "bg-zinc-100"
                    }`}
                  >
                    {roleLabels[inv.role]?.label || inv.role}
                  </span>
                  <button className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <InviteModal
          onClose={() => setShowInviteModal(false)}
          onInvited={() => {
            setShowInviteModal(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
}

function InviteModal({
  onClose,
  onInvited,
}: {
  onClose: () => void;
  onInvited: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState<{
    email: string;
    role: "ADMIN" | "EDITOR" | "AUTHOR";
  }>({
    email: "",
    role: "EDITOR",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setSuccess(data.message);
        setTimeout(onInvited, 1500);
      }
    } catch {
      setError("Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Kullanıcı Davet Et</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">E-posta</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="ornek@email.com"
              className="w-full rounded-lg border bg-background px-4 py-2 focus:border-primary focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Rol</label>
            <select
              value={form.role}
              onChange={(e) =>
                setForm({
                  ...form,
                  role: e.target.value as "ADMIN" | "EDITOR" | "AUTHOR",
                })
              }
              className="w-full rounded-lg border bg-background px-4 py-2 focus:border-primary focus:outline-none"
            >
              <option value="ADMIN">Yönetici - Tam yetki</option>
              <option value="EDITOR">Editör - İçerik yönetimi</option>
              <option value="AUTHOR">Yazar - Sadece kendi içerikleri</option>
            </select>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          {success && (
            <p className="text-sm text-green-600">{success}</p>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? "Gönderiliyor..." : "Davet Gönder"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
