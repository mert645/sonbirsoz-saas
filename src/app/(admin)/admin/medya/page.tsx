"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Sparkles, Search, Grid, List, Trash2, Copy, ImageIcon, Loader2, AlertTriangle, X, Check, Folder, FolderPlus, Move } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils/format";
import { generateImageViaApi, type GenerateImageParams } from "@/lib/ai/generate-image-client";

interface MediaItem { id: string; url: string; filename: string; alt: string | null; width: number | null; height: number | null; size: number | null; format: string | null; folder: string; createdAt: string; }
type ViewMode = "grid" | "list";
function formatBytes(b: number | null): string { if (!b) return "—"; if (b >= 1048576) return `${(b/1048576).toFixed(1)} MB`; if (b >= 1024) return `${(b/1024).toFixed(0)} KB`; return `${b} B`; }
const DEFAULT_FOLDERS = ["Genel","Haberler","Spor","Ekonomi","Teknoloji","Sosyal Medya"];

export default function MediaLibraryPage() {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [folders, setFolders] = useState<string[]>(DEFAULT_FOLDERS);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MediaItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [moveTarget, setMoveTarget] = useState<MediaItem | null>(null);
  const [movingToFolder, setMovingToFolder] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [showAI, setShowAI] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiFormat, setAiFormat] = useState<NonNullable<GenerateImageParams["purpose"]>>("cover");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuccess, setAiSuccess] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMedia = useCallback(async () => {
    setLoading(true); setApiError(null);
    try {
      const res = await fetch("/api/admin/media");
      const json = await res.json();
      if (!res.ok) { setApiError(json.error || "Medya yüklenemedi."); return; }
      const items: MediaItem[] = (json.data ?? []).map((m: MediaItem) => ({ ...m, folder: m.folder || "Genel" }));
      setMedia(items);
      const dbFolders: string[] = json.folders ?? [];
      setFolders(prev => Array.from(new Set([...DEFAULT_FOLDERS, ...dbFolders, ...prev])).sort());
    } catch { setApiError("Bağlantı hatası."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchMedia(); }, [fetchMedia]);

  const filtered = media.filter(m => {
    const inFolder = activeFolder ? m.folder === activeFolder : true;
    return inFolder && m.filename.toLowerCase().includes(searchQuery.toLowerCase());
  });
  const folderCounts = media.reduce<Record<string, number>>((a, m) => { a[m.folder] = (a[m.folder] ?? 0) + 1; return a; }, {});

  async function copyUrl(item: MediaItem) { await navigator.clipboard.writeText(item.url); setCopiedId(item.id); setTimeout(() => setCopiedId(null), 2000); }

  async function handleDelete() {
    if (!deleteTarget) return; setDeleting(true);
    try { const r = await fetch(`/api/admin/media/${deleteTarget.id}`, { method: "DELETE" }); if (r.ok) { setMedia(p => p.filter(m => m.id !== deleteTarget.id)); setDeleteTarget(null); } }
    finally { setDeleting(false); }
  }

  async function handleMove() {
    if (!moveTarget || !movingToFolder) return;
    const r = await fetch(`/api/admin/media/${moveTarget.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ folder: movingToFolder }) });
    if (r.ok) { setMedia(p => p.map(m => m.id === moveTarget.id ? { ...m, folder: movingToFolder } : m)); setMoveTarget(null); }
  }

  function handleAddFolder() {
    const name = newFolderName.trim();
    if (!name) return;
    setFolders(prev => Array.from(new Set([...prev, name])).sort());
    setActiveFolder(name); setNewFolderName(""); setShowNewFolder(false);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files; if (!files?.length) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const reader = new FileReader();
      await new Promise<void>(resolve => {
        reader.onload = async () => {
          const dataUrl = reader.result as string;
          const img = document.createElement("img"); img.src = dataUrl;
          await new Promise<void>(r => { img.onload = () => r(); });
          await fetch("/api/admin/media", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: dataUrl, filename: file.name, format: file.type.split("/")[1] ?? "jpeg", size: file.size, width: img.naturalWidth || null, height: img.naturalHeight || null, folder: activeFolder ?? "Genel" }) });
          resolve();
        };
        reader.readAsDataURL(file);
      });
    }
    setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; await fetchMedia();
  }

  async function handleAIGenerate() {
    if (!aiPrompt.trim()) return;
    setAiGenerating(true); setAiError(null); setAiSuccess(false);
    try {
      const { imageUrl } = await generateImageViaApi({ prompt: aiPrompt, purpose: aiFormat });
      await fetch("/api/admin/media", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: imageUrl, filename: `ai-${aiFormat}-${Date.now()}.webp`, format: "webp", width: null, height: null, alt: aiPrompt.slice(0, 100), folder: activeFolder ?? "Genel" }) });
      setAiSuccess(true);
      await fetchMedia();
    } catch (err) { setAiError(err instanceof Error ? err.message : "Üretim başarısız."); }
    finally { setAiGenerating(false); }
  }

  const FORMAT_LABELS: Record<string, string> = { cover: "Kapak (1200x675)", social_square: "Kare (1080x1080)", social_story: "Story (1080x1920)", thumbnail: "Thumbnail (400x225)" };

  return (
    <div className="flex gap-6">
      {/* Sol: Klasör Paneli */}
      <div className="w-52 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Klasörler</span>
          <button onClick={() => setShowNewFolder(true)} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><FolderPlus className="h-4 w-4" /></button>
        </div>
        {showNewFolder && (
          <div className="mb-2 flex gap-1">
            <input autoFocus value={newFolderName} onChange={e => setNewFolderName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") handleAddFolder(); if (e.key === "Escape") { setShowNewFolder(false); setNewFolderName(""); } }} placeholder="Klasör adı..." className="flex-1 min-w-0 rounded-md border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary" />
            <button onClick={handleAddFolder} className="rounded p-1 bg-primary text-white"><Check className="h-3.5 w-3.5" /></button>
            <button onClick={() => { setShowNewFolder(false); setNewFolderName(""); }} className="rounded p-1 text-muted-foreground hover:bg-muted"><X className="h-3.5 w-3.5" /></button>
          </div>
        )}
        <nav className="space-y-0.5">
          <button onClick={() => setActiveFolder(null)} className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${activeFolder === null ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-muted"}`}>
            <ImageIcon className="h-4 w-4 shrink-0" /><span className="flex-1 text-left">Tüm Görseller</span><span className="text-xs text-muted-foreground">{media.length}</span>
          </button>
          {folders.map(folder => (
            <button key={folder} onClick={() => setActiveFolder(folder)} className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${activeFolder === folder ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-muted"}`}>
              <Folder className="h-4 w-4 shrink-0" /><span className="flex-1 text-left truncate">{folder}</span>{(folderCounts[folder] ?? 0) > 0 && <span className="text-xs text-muted-foreground">{folderCounts[folder]}</span>}
            </button>
          ))}
        </nav>
      </div>

      {/* Sağ: İçerik */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Medya Kütüphanesi</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{activeFolder ? `${activeFolder} — ` : ""}{filtered.length} dosya</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => { setShowAI(!showAI); setAiError(null); setAiSuccess(false); }}>
              <Sparkles className="h-4 w-4 text-purple-500" /> AI Görsel Üret
            </Button>
            <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Yükle
            </Button>
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileUpload} />
          </div>
        </div>

        {apiError && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />{apiError}
            <button onClick={fetchMedia} className="ml-auto underline">Yenile</button>
          </div>
        )}

        {showAI && (
          <Card className="mb-4 border-purple-500/20">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-purple-500" /><span className="text-sm font-medium">AI Görsel Üretici</span></div>
              <div className="grid gap-3 md:grid-cols-4">
                <div className="md:col-span-3">
                  <textarea value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} placeholder="Görsel açıklaması… Örn: Türkiye ekonomi, borsa grafik, kırmızı-yeşil" rows={2} className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
                <div className="space-y-2">
                  <select value={aiFormat} onChange={e => setAiFormat(e.target.value as NonNullable<GenerateImageParams["purpose"]>)} className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none">
                    {Object.entries(FORMAT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                  <Button className="w-full" size="sm" disabled={!aiPrompt.trim() || aiGenerating} onClick={handleAIGenerate}>
                    {aiGenerating ? <><Loader2 className="h-4 w-4 animate-spin" /> Üretiliyor…</> : <><Sparkles className="h-4 w-4" /> Üret</>}
                  </Button>
                </div>
              </div>
              {aiError && <p className="text-xs text-destructive">{aiError}</p>}
              {aiSuccess && <p className="text-xs text-emerald-600 font-medium">✓ Görsel üretildi ve {activeFolder ?? "Genel"} klasörüne eklendi.</p>}
              <p className="text-xs text-muted-foreground">Üretilen görsel otomatik olarak kütüphaneye eklenir.</p>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="Dosya ara…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full rounded-md border bg-background py-2 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="flex items-center rounded-md border">
            <button onClick={() => setViewMode("grid")} className={`p-2 ${viewMode === "grid" ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}><Grid className="h-4 w-4" /></button>
            <button onClick={() => setViewMode("list")} className={`p-2 ${viewMode === "list" ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}><List className="h-4 w-4" /></button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Yükleniyor…</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
            <ImageIcon className="h-12 w-12 opacity-30" />
            <p className="text-sm">{searchQuery ? `"${searchQuery}" ile eşleşen görsel bulunamadı.` : "Bu klasörde henüz görsel yok."}</p>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}><Upload className="h-4 w-4" /> Görsel Yükle</Button>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map(item => (
              <div key={item.id} className="group relative overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md">
                <div className="relative aspect-video bg-muted">
                  <Image src={item.url} alt={item.alt ?? item.filename} fill className="object-cover" sizes="(max-width:768px) 100vw,25vw" unoptimized={item.url.startsWith("data:")} />
                  <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                    <button onClick={() => copyUrl(item)} className="rounded-full bg-white/10 p-2 backdrop-blur-sm hover:bg-white/20">{copiedId === item.id ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4 text-white" />}</button>
                    <button onClick={() => { setMoveTarget(item); setMovingToFolder(item.folder); }} className="rounded-full bg-white/10 p-2 backdrop-blur-sm hover:bg-white/20"><Move className="h-4 w-4 text-white" /></button>
                    <button onClick={() => setDeleteTarget(item)} className="rounded-full bg-white/10 p-2 backdrop-blur-sm hover:bg-red-500/50"><Trash2 className="h-4 w-4 text-white" /></button>
                  </div>
                </div>
                <div className="p-3">
                  <p className="truncate text-xs font-medium">{item.filename}</p>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Folder className="h-3 w-3" />{item.folder}</span>
                    <span>{formatBytes(item.size)}</span>
                    <span>{formatRelativeTime(item.createdAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full">
              <thead><tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Dosya</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Klasör</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Boyut</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Tarih</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">İşlem</th>
              </tr></thead>
              <tbody>{filtered.map(item => (
                <tr key={item.id} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="relative h-10 w-16 shrink-0 overflow-hidden rounded bg-muted"><Image src={item.url} alt={item.alt ?? item.filename} fill className="object-cover" sizes="64px" unoptimized={item.url.startsWith("data:")} /></div><span className="max-w-[200px] truncate text-sm font-medium">{item.filename}</span></div></td>
                  <td className="px-4 py-3"><span className="flex items-center gap-1 text-xs text-muted-foreground"><Folder className="h-3.5 w-3.5" />{item.folder}</span></td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{formatBytes(item.size)}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{formatRelativeTime(item.createdAt)}</td>
                  <td className="px-4 py-3"><div className="flex justify-end gap-1">
                    <button onClick={() => copyUrl(item)} className="rounded p-1.5 text-muted-foreground hover:bg-muted">{copiedId === item.id ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}</button>
                    <button onClick={() => { setMoveTarget(item); setMovingToFolder(item.folder); }} className="rounded p-1.5 text-muted-foreground hover:bg-muted"><Move className="h-4 w-4" /></button>
                    <button onClick={() => setDeleteTarget(item)} className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                  </div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>

      {/* Taşı Modalı */}
      {moveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border bg-background shadow-xl">
            <div className="px-6 py-5">
              <h3 className="text-base font-semibold flex items-center gap-2"><Move className="h-4 w-4" />Klasöre Taşı</h3>
              <p className="mt-1 text-xs text-muted-foreground truncate">{moveTarget.filename}</p>
              <div className="mt-4 space-y-1.5 max-h-60 overflow-y-auto">
                {folders.map(f => (
                  <button key={f} onClick={() => setMovingToFolder(f)} className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${movingToFolder === f ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"}`}>
                    <Folder className="h-4 w-4 shrink-0" />{f}{movingToFolder === f && <Check className="h-4 w-4 ml-auto" />}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t px-6 py-4">
              <Button variant="outline" onClick={() => setMoveTarget(null)}>İptal</Button>
              <Button onClick={handleMove} disabled={movingToFolder === moveTarget.folder}>Taşı</Button>
            </div>
          </div>
        </div>
      )}

      {/* Sil Modalı */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border bg-background shadow-xl">
            <div className="px-6 py-5">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10"><AlertTriangle className="h-6 w-6 text-destructive" /></div>
              <h2 className="text-lg font-semibold">Görseli Sil</h2>
              <p className="mt-2 text-sm text-muted-foreground"><strong className="text-foreground">{deleteTarget.filename}</strong> silinsin mi?</p>
            </div>
            <div className="flex justify-end gap-2 border-t px-6 py-4">
              <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>İptal</Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleting}>{deleting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}Evet, Sil</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
