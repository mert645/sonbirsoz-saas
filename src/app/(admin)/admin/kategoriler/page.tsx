"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Loader2, AlertTriangle, X, Check } from "lucide-react";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string;
  icon: string | null;
  parentId: string | null;
  parentName: string | null;
  order: number;
  isActive: boolean;
  articleCount: number;
}

const DEFAULT_COLOR = "#4F46E5";

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#10b981",
  "#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4",
  "#14b8a6", "#a855f7", "#f43f5e", "#4F46E5",
];

interface FormState {
  name: string;
  slug: string;
  color: string;
  description: string;
  order: string;
  parentId: string;
  isActive: boolean;
}

const emptyForm = (): FormState => ({
  name: "",
  slug: "",
  color: DEFAULT_COLOR,
  description: "",
  order: "0",
  parentId: "",
  isActive: true,
});

export default function AdminKategorilerPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleteBlocked, setDeleteBlocked] = useState<{ articleCount: number } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/categories");
      if (!res.ok) throw new Error("Kategoriler yüklenemedi.");
      const json = await res.json();
      setCategories(json.data ?? []);
    } catch {
      setError("Kategoriler yüklenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(cat: Category) {
    setEditingId(cat.id);
    setForm({
      name: cat.name,
      slug: cat.slug,
      color: cat.color,
      description: cat.description ?? "",
      order: String(cat.order),
      parentId: cat.parentId ?? "",
      isActive: cat.isActive,
    });
    setFormError(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm());
    setFormError(null);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setFormError("Kategori adı zorunludur.");
      return;
    }
    if (!/^#[0-9a-fA-F]{6}$/.test(form.color)) {
      setFormError("Geçerli bir renk kodu girin (örn: #ef4444).");
      return;
    }

    setSaving(true);
    setFormError(null);

    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim() || undefined,
      color: form.color,
      description: form.description.trim() || undefined,
      order: parseInt(form.order, 10) || 0,
      parentId: form.parentId || null,
      isActive: form.isActive,
    };

    try {
      const url = editingId
        ? `/api/admin/categories/${editingId}`
        : "/api/admin/categories";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        setFormError(json.error ?? "Kayıt sırasında bir hata oluştu.");
        return;
      }

      closeModal();
      await fetchCategories();
    } catch {
      setFormError("Sunucuya bağlanılamadı.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteBlocked(null);

    try {
      const res = await fetch(`/api/admin/categories/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const json = await res.json();

      if (res.status === 409 && json.blocked) {
        setDeleteBlocked({ articleCount: json.articleCount });
        setDeleting(false);
        return;
      }

      if (!res.ok) {
        alert(json.error ?? "Silme işlemi başarısız.");
        setDeleting(false);
        return;
      }

      setDeleteTarget(null);
      setDeleteBlocked(null);
      await fetchCategories();
    } catch {
      alert("Sunucuya bağlanılamadı.");
    } finally {
      setDeleting(false);
    }
  }

  const parentOptions = categories.filter((c) =>
    editingId ? c.id !== editingId : true
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kategoriler</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Haber kategorilerini yönetin
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-1.5 h-4 w-4" />
          Yeni Kategori
        </Button>
      </div>

      <Card className="mt-6">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Yükleniyor…
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-destructive">
              <AlertTriangle className="h-6 w-6" />
              <p className="text-sm">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchCategories}>
                Tekrar Dene
              </Button>
            </div>
          ) : categories.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              Henüz kategori yok.{" "}
              <button
                className="text-primary underline-offset-2 hover:underline"
                onClick={openCreate}
              >
                İlk kategoriyi ekle
              </button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                    Renk
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                    Kategori
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                    Slug
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                    Üst Kategori
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                    Haberler
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                    Durum
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">
                    İşlem
                  </th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr
                    key={cat.id}
                    className="border-b last:border-0 hover:bg-muted/50"
                  >
                    <td className="px-4 py-3">
                      <span
                        className="inline-block h-4 w-4 rounded-full border border-black/10"
                        style={{ backgroundColor: cat.color }}
                      />
                    </td>
                    <td className="px-4 py-3 font-medium">{cat.name}</td>
                    <td className="px-4 py-3 font-mono text-sm text-muted-foreground">
                      {cat.slug}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {cat.parentName ?? <span className="italic">—</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {cat.articleCount}
                    </td>
                    <td className="px-4 py-3">
                      {cat.isActive ? (
                        <Badge variant="success">Aktif</Badge>
                      ) : (
                        <Badge variant="secondary">Pasif</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => openEdit(cat)}
                          className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                          title="Düzenle"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setDeleteBlocked(null);
                            setDeleteTarget(cat);
                          }}
                          className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                          title="Sil"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* ── Ekle / Düzenle Modalı ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border bg-background shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold">
                {editingId ? "Kategori Düzenle" : "Yeni Kategori"}
              </h2>
              <button
                onClick={closeModal}
                className="rounded p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              {formError && (
                <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  {formError}
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Kategori Adı <span className="text-destructive">*</span>
                </label>
                <input
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring"
                  placeholder="Gündem"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Slug{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    (boş bırakılırsa otomatik üretilir)
                  </span>
                </label>
                <input
                  className="w-full rounded-lg border bg-background px-3 py-2 font-mono text-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring"
                  placeholder="gundem"
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">Renk</label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setForm((f) => ({ ...f, color: c }))}
                      className="relative h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
                      style={{
                        backgroundColor: c,
                        borderColor: form.color === c ? "white" : "transparent",
                        outline: form.color === c ? `2px solid ${c}` : "none",
                      }}
                      title={c}
                    >
                      {form.color === c && (
                        <Check className="absolute inset-0 m-auto h-3.5 w-3.5 text-white drop-shadow" />
                      )}
                    </button>
                  ))}
                  <input
                    type="text"
                    className="w-24 rounded-lg border bg-background px-2 py-1 font-mono text-xs outline-none ring-offset-background focus:ring-2 focus:ring-ring"
                    value={form.color}
                    onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                    placeholder="#4F46E5"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">Açıklama</label>
                <textarea
                  className="w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring"
                  rows={2}
                  placeholder="Opsiyonel açıklama"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Sıra</label>
                  <input
                    type="number"
                    min={0}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring"
                    value={form.order}
                    onChange={(e) => setForm((f) => ({ ...f, order: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Üst Kategori
                  </label>
                  <select
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring"
                    value={form.parentId}
                    onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value }))}
                  >
                    <option value="">— Yok —</option>
                    {parentOptions.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.isActive}
                  onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    form.isActive ? "bg-primary" : "bg-input"
                  }`}
                >
                  <span
                    className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform ${
                      form.isActive ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
                <span className="text-sm">
                  {form.isActive ? "Aktif" : "Pasif"}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t px-6 py-4">
              <Button variant="outline" onClick={closeModal} disabled={saving}>
                İptal
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                {editingId ? "Kaydet" : "Oluştur"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Silme Onay Modalı ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border bg-background shadow-xl">
            <div className="px-6 py-5">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>

              {deleteBlocked ? (
                <>
                  <h2 className="text-lg font-semibold">Kategori Silinemez</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    <strong className="text-foreground">{deleteTarget.name}</strong>{" "}
                    kategorisine bağlı{" "}
                    <strong className="text-foreground">
                      {deleteBlocked.articleCount} haber
                    </strong>{" "}
                    var. Silmeden önce haberleri başka bir kategoriye taşıyın.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-lg font-semibold">Kategoriyi Sil</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    <strong className="text-foreground">{deleteTarget.name}</strong>{" "}
                    kategorisini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
                  </p>
                  {deleteTarget.articleCount > 0 && (
                    <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-500/10 px-3 py-2.5 text-sm text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      Bu kategoriye bağlı {deleteTarget.articleCount} haber var.
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t px-6 py-4">
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteBlocked(null);
                }}
                disabled={deleting}
              >
                {deleteBlocked ? "Kapat" : "İptal"}
              </Button>
              {!deleteBlocked && (
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                  Evet, Sil
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
