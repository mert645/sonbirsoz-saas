"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Loader2, AlertTriangle, X, User } from "lucide-react";

interface Author {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  avatar: string | null;
  email: string | null;
  expertise: string[];
  socialLinks: Record<string, string> | null;
  isActive: boolean;
  articleCount: number;
}

interface FormState {
  name: string;
  slug: string;
  bio: string;
  avatar: string;
  email: string;
  expertise: string;
  twitter: string;
  instagram: string;
  isActive: boolean;
}

const emptyForm = (): FormState => ({
  name: "",
  slug: "",
  bio: "",
  avatar: "",
  email: "",
  expertise: "",
  twitter: "",
  instagram: "",
  isActive: true,
});

function formToPayload(form: FormState) {
  const expertiseArr = form.expertise
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const socialLinks: Record<string, string> = {};
  if (form.twitter.trim()) socialLinks.twitter = form.twitter.trim();
  if (form.instagram.trim()) socialLinks.instagram = form.instagram.trim();

  return {
    name: form.name.trim(),
    slug: form.slug.trim() || undefined,
    bio: form.bio.trim() || null,
    avatar: form.avatar.trim() || null,
    email: form.email.trim() || null,
    expertise: expertiseArr,
    socialLinks: Object.keys(socialLinks).length > 0 ? socialLinks : null,
    isActive: form.isActive,
  };
}

function authorToForm(a: Author): FormState {
  return {
    name: a.name,
    slug: a.slug,
    bio: a.bio ?? "",
    avatar: a.avatar ?? "",
    email: a.email ?? "",
    expertise: (a.expertise ?? []).join(", "),
    twitter: a.socialLinks?.twitter ?? "",
    instagram: a.socialLinks?.instagram ?? "",
    isActive: a.isActive,
  };
}

export default function AdminYazarlarPage() {
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Author | null>(null);
  const [deleteBlocked, setDeleteBlocked] = useState<{ articleCount: number } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAuthors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/authors");
      if (!res.ok) throw new Error();
      const json = await res.json();
      setAuthors(json.data ?? []);
    } catch {
      setError("Yazarlar yüklenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAuthors();
  }, [fetchAuthors]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(a: Author) {
    setEditingId(a.id);
    setForm(authorToForm(a));
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
      setFormError("Yazar adı zorunludur.");
      return;
    }

    setSaving(true);
    setFormError(null);

    const payload = formToPayload(form);

    try {
      const url = editingId ? `/api/admin/authors/${editingId}` : "/api/admin/authors";
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
      await fetchAuthors();
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
      const res = await fetch(`/api/admin/authors/${deleteTarget.id}`, {
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
      await fetchAuthors();
    } catch {
      alert("Sunucuya bağlanılamadı.");
    } finally {
      setDeleting(false);
    }
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Yazarlar</h1>
          <p className="mt-1 text-sm text-muted-foreground">Yazar ve editörleri yönetin</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-1.5 h-4 w-4" />
          Yeni Yazar
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
              <Button variant="outline" size="sm" onClick={fetchAuthors}>
                Tekrar Dene
              </Button>
            </div>
          ) : authors.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              Henüz yazar yok.{" "}
              <button
                className="text-primary underline-offset-2 hover:underline"
                onClick={openCreate}
              >
                İlk yazarı ekle
              </button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Yazar</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">E-posta</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Uzmanlık</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Haberler</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Durum</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {authors.map((a) => (
                  <tr key={a.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {a.avatar ? (
                          <img
                            src={a.avatar}
                            alt={a.name}
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium leading-none">{a.name}</p>
                          <p className="mt-0.5 font-mono text-xs text-muted-foreground">{a.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {a.email ?? <span className="italic">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(a.expertise ?? []).slice(0, 2).map((exp) => (
                          <Badge key={exp} variant="secondary" className="text-[10px]">
                            {exp}
                          </Badge>
                        ))}
                        {(a.expertise ?? []).length > 2 && (
                          <Badge variant="secondary" className="text-[10px]">
                            +{a.expertise.length - 2}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{a.articleCount}</td>
                    <td className="px-4 py-3">
                      {a.isActive ? (
                        <Badge variant="success">Aktif</Badge>
                      ) : (
                        <Badge variant="secondary">Pasif</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => openEdit(a)}
                          className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                          title="Düzenle"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => { setDeleteBlocked(null); setDeleteTarget(a); }}
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
          <div className="w-full max-w-lg rounded-xl border bg-background shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold">
                {editingId ? "Yazarı Düzenle" : "Yeni Yazar"}
              </h2>
              <button onClick={closeModal} className="rounded p-1 text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto">
              <div className="space-y-4 px-6 py-5">
                {formError && (
                  <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    {formError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="mb-1.5 block text-sm font-medium">
                      Ad Soyad <span className="text-destructive">*</span>
                    </label>
                    <input
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                      placeholder="Ahmet Yılmaz"
                      value={form.name}
                      onChange={(e) => setField("name", e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium">
                      Slug{" "}
                      <span className="text-xs font-normal text-muted-foreground">(opsiyonel)</span>
                    </label>
                    <input
                      className="w-full rounded-lg border bg-background px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-ring"
                      placeholder="ahmet-yilmaz"
                      value={form.slug}
                      onChange={(e) => setField("slug", e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium">E-posta</label>
                    <input
                      type="email"
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                      placeholder="ahmet@sonbirsoz.com"
                      value={form.email}
                      onChange={(e) => setField("email", e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium">Biyografi</label>
                  <textarea
                    className="w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                    rows={3}
                    placeholder="Yazar hakkında kısa bir açıklama…"
                    value={form.bio}
                    onChange={(e) => setField("bio", e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium">Avatar URL</label>
                  <input
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                    placeholder="https://..."
                    value={form.avatar}
                    onChange={(e) => setField("avatar", e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Uzmanlık Alanları
                    <span className="ml-1 text-xs font-normal text-muted-foreground">(virgülle ayırın)</span>
                  </label>
                  <input
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Gündem, Politika, Ekonomi"
                    value={form.expertise}
                    onChange={(e) => setField("expertise", e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Twitter</label>
                    <input
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                      placeholder="https://twitter.com/..."
                      value={form.twitter}
                      onChange={(e) => setField("twitter", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Instagram</label>
                    <input
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                      placeholder="https://instagram.com/..."
                      value={form.instagram}
                      onChange={(e) => setField("instagram", e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={form.isActive}
                    onClick={() => setField("isActive", !form.isActive)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                      form.isActive ? "bg-primary" : "bg-input"
                    }`}
                  >
                    <span
                      className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg transition-transform ${
                        form.isActive ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                  <span className="text-sm">{form.isActive ? "Aktif" : "Pasif"}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t px-6 py-4">
              <Button variant="outline" onClick={closeModal} disabled={saving}>İptal</Button>
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
                  <h2 className="text-lg font-semibold">Yazar Silinemez</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    <strong className="text-foreground">{deleteTarget.name}</strong> yazarına bağlı{" "}
                    <strong className="text-foreground">{deleteBlocked.articleCount} haber</strong> var.
                    Silmeden önce haberleri başka bir yazara aktarın.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-lg font-semibold">Yazarı Sil</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    <strong className="text-foreground">{deleteTarget.name}</strong> yazarını silmek
                    istediğinize emin misiniz? Bu işlem geri alınamaz.
                  </p>
                </>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t px-6 py-4">
              <Button
                variant="outline"
                onClick={() => { setDeleteTarget(null); setDeleteBlocked(null); }}
                disabled={deleting}
              >
                {deleteBlocked ? "Kapat" : "İptal"}
              </Button>
              {!deleteBlocked && (
                <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
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
