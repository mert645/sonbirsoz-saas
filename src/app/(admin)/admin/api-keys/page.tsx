"use client";

import { useState, useEffect } from "react";
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  key?: string; // Sadece oluşturma anında
  scopes: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

interface ApiScope {
  [key: string]: string;
}

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [availableScopes, setAvailableScopes] = useState<ApiScope>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKey, setNewKey] = useState<ApiKey | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const res = await fetch("/api/admin/api-keys");
      if (res.status === 403) {
        setError("API erişimi sadece Enterprise plan için geçerlidir. Planınızı yükseltin.");
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error("API anahtarları yüklenemedi");
      const data = await res.json();
      setApiKeys(data.apiKeys);
      setAvailableScopes(data.availableScopes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu API anahtarını silmek istediğinizden emin misiniz?")) return;

    try {
      const res = await fetch(`/api/admin/api-keys?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Silme başarısız");
      setApiKeys(apiKeys.filter((k) => k.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Silme hatası");
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const res = await fetch("/api/admin/api-keys", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: !isActive }),
      });
      if (!res.ok) throw new Error("Güncelleme başarısız");
      const data = await res.json();
      setApiKeys(apiKeys.map((k) => (k.id === id ? data.apiKey : k)));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Güncelleme hatası");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 dark:border-amber-900 dark:bg-amber-950">
        <div className="flex items-start gap-3">
          <Shield className="h-6 w-6 text-amber-600" />
          <div>
            <h3 className="font-semibold text-amber-800 dark:text-amber-200">
              API Erişimi Kısıtlı
            </h3>
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
              {error}
            </p>
            <a
              href="/admin/fatura"
              className="mt-3 inline-block text-sm font-medium text-amber-800 underline hover:no-underline dark:text-amber-200"
            >
              Plan & Kullanım sayfasına git →
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">API Anahtarları</h1>
          <p className="text-muted-foreground">
            Harici uygulamalar için API anahtarlarını yönetin
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Yeni Anahtar
        </button>
      </div>

      {/* API Keys List */}
      <div className="rounded-lg border bg-card">
        {apiKeys.length === 0 ? (
          <div className="p-8 text-center">
            <Key className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 font-semibold">Henüz API anahtarı yok</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Harici uygulamalarınız için API anahtarı oluşturun
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {apiKeys.map((apiKey) => (
              <div
                key={apiKey.id}
                className="flex items-center justify-between p-4"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg",
                      apiKey.isActive
                        ? "bg-green-100 text-green-600 dark:bg-green-900/30"
                        : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800"
                    )}
                  >
                    <Key className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{apiKey.name}</span>
                      {!apiKey.isActive && (
                        <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400">
                          Devre Dışı
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                        {apiKey.keyPrefix}...
                      </code>
                      <span>•</span>
                      <span>{apiKey.scopes.length} yetki</span>
                      {apiKey.lastUsedAt && (
                        <>
                          <span>•</span>
                          <span>
                            Son kullanım:{" "}
                            {new Date(apiKey.lastUsedAt).toLocaleDateString("tr-TR")}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleActive(apiKey.id, apiKey.isActive)}
                    className={cn(
                      "rounded-lg p-2 transition-colors",
                      apiKey.isActive
                        ? "text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                        : "text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    )}
                    title={apiKey.isActive ? "Devre dışı bırak" : "Etkinleştir"}
                  >
                    {apiKey.isActive ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(apiKey.id)}
                    className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                    title="Sil"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateApiKeyModal
          availableScopes={availableScopes}
          onClose={() => {
            setShowCreateModal(false);
            setNewKey(null);
          }}
          onCreated={(key) => {
            setNewKey(key);
            setApiKeys([key, ...apiKeys]);
          }}
          newKey={newKey}
          copied={copied}
          onCopy={copyToClipboard}
        />
      )}
    </div>
  );
}

function CreateApiKeyModal({
  availableScopes,
  onClose,
  onCreated,
  newKey,
  copied,
  onCopy,
}: {
  availableScopes: ApiScope;
  onClose: () => void;
  onCreated: (key: ApiKey) => void;
  newKey: ApiKey | null;
  copied: boolean;
  onCopy: (text: string) => void;
}) {
  const [name, setName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name || selectedScopes.length === 0) {
      alert("İsim ve en az bir yetki seçin");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/admin/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, scopes: selectedScopes }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Oluşturma başarısız");
      }

      const data = await res.json();
      onCreated(data.apiKey);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setCreating(false);
    }
  };

  const toggleScope = (scope: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scope)
        ? prev.filter((s) => s !== scope)
        : [...prev, scope]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg bg-card p-6 shadow-xl">
        {newKey?.key ? (
          // Anahtar oluşturuldu - göster
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-green-600">
              <Check className="h-6 w-6" />
              <h2 className="text-lg font-semibold">API Anahtarı Oluşturuldu</h2>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Bu anahtarı güvenli bir yerde saklayın. Tekrar gösterilmeyecektir!
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">API Anahtarı</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-lg border bg-muted p-3 font-mono text-sm">
                  {newKey.key}
                </code>
                <button
                  onClick={() => onCopy(newKey.key!)}
                  className="rounded-lg border p-3 hover:bg-muted"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Tamam
            </button>
          </div>
        ) : (
          // Oluşturma formu
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Yeni API Anahtarı</h2>

            <div>
              <label className="mb-1 block text-sm font-medium">İsim</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Örn: Mobile App, WordPress Plugin"
                className="w-full rounded-lg border bg-background px-4 py-2"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Yetkiler</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(availableScopes).map(([scope, description]) => (
                  <label
                    key={scope}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-lg border p-3 transition-colors",
                      selectedScopes.includes(scope)
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selectedScopes.includes(scope)}
                      onChange={() => toggleScope(scope)}
                      className="rounded"
                    />
                    <div>
                      <code className="text-xs">{scope}</code>
                      <p className="text-xs text-muted-foreground">
                        {description}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 rounded-lg border py-2 text-sm font-medium hover:bg-muted"
              >
                İptal
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !name || selectedScopes.length === 0}
                className="flex-1 rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {creating ? (
                  <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                ) : (
                  "Oluştur"
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
