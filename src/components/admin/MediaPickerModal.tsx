"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Search,
  Upload,
  X,
  Check,
  ImageIcon,
  Loader2,
  Grid,
  List,
  Folder,
} from "lucide-react";

interface MediaItem {
  id: string;
  url: string;
  filename: string;
  alt: string | null;
  width: number | null;
  height: number | null;
  size: number | null;
  format: string | null;
  folder: string;
  createdAt: string;
}

interface MediaPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

export function MediaPickerModal({ open, onClose, onSelect }: MediaPickerModalProps) {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/media");
      if (!res.ok) return;
      const json = await res.json();
      setMedia(json.data ?? []);
      setFolders(["Tümü", ...(json.folders ?? [])]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setSelected(null);
      setSearch("");
      setActiveFolder(null);
      fetchMedia();
    }
  }, [open, fetchMedia]);

  // ESC ile kapat
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const reader = new FileReader();
      await new Promise<void>((resolve) => {
        reader.onload = async () => {
          const dataUrl = reader.result as string;
          const img = document.createElement("img");
          img.src = dataUrl;
          await new Promise<void>((r) => { img.onload = () => r(); });
          await fetch("/api/admin/media", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              url: dataUrl,
              filename: file.name,
              format: file.type.split("/")[1] ?? "jpeg",
              size: file.size,
              width: img.naturalWidth || null,
              height: img.naturalHeight || null,
            }),
          });
          resolve();
        };
        reader.readAsDataURL(file);
      });
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    await fetchMedia();
  }

  const filtered = media.filter((m) => {
    const inFolder = !activeFolder || activeFolder === "Tümü" ? true : m.folder === activeFolder;
    return inFolder && m.filename.toLowerCase().includes(search.toLowerCase());
  });

  function handleConfirm() {
    if (!selected) return;
    onSelect(selected);
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex h-[80vh] w-full max-w-4xl flex-col rounded-2xl border border-border bg-background shadow-2xl">

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-base font-semibold">Medya Kütüphanesi</h2>
            <p className="text-xs text-muted-foreground">Bir görsel seçin veya yeni yükleyin</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading
                ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                : <Upload className="mr-1.5 h-3.5 w-3.5" />}
              Yükle
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileUpload}
            />
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex shrink-0 items-center gap-3 border-b px-5 py-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Dosya adıyla ara…"
              className="w-full rounded-lg border bg-background py-1.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex items-center rounded-lg border">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 ${viewMode === "grid" ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 ${viewMode === "list" ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          <span className="text-xs text-muted-foreground">{filtered.length} dosya</span>
        </div>

        {/* Klasör Sekmeleri */}
        {folders.length > 1 && (
          <div className="flex shrink-0 gap-1 overflow-x-auto border-b px-5 pb-2 pt-1">
            {["Tümü", ...folders.filter((f) => f !== "Tümü")].map((f) => (
              <button key={f} onClick={() => setActiveFolder(f === "Tümü" ? null : f)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  (f === "Tümü" && !activeFolder) || activeFolder === f
                    ? "bg-primary text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                }`}>
                {f !== "Tümü" && <Folder className="h-3 w-3" />}{f}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Yükleniyor…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
              <ImageIcon className="h-12 w-12 opacity-30" />
              <p className="text-sm">
                {search ? `"${search}" ile eşleşen görsel bulunamadı.` : "Henüz görsel yok."}
              </p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {filtered.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelected(item.url === selected ? null : item.url)}
                  className={`group relative overflow-hidden rounded-xl border-2 transition-all ${
                    selected === item.url
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-transparent hover:border-border"
                  }`}
                >
                  <div className="relative aspect-video bg-muted">
                    <Image
                      src={item.url}
                      alt={item.alt ?? item.filename}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 33vw, 25vw"
                      unoptimized={item.url.startsWith("data:")}
                    />
                    {selected === item.url && (
                      <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white shadow-lg">
                          <Check className="h-4 w-4" />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="px-2 py-1.5 text-left">
                    <p className="truncate text-xs font-medium">{item.filename}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {item.width && item.height ? `${item.width}×${item.height} · ` : ""}{formatBytes(item.size)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="divide-y rounded-xl border overflow-hidden">
              {filtered.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelected(item.url === selected ? null : item.url)}
                  className={`flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-muted/50 ${
                    selected === item.url ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                    <Image
                      src={item.url}
                      alt={item.alt ?? item.filename}
                      fill
                      className="object-cover"
                      sizes="80px"
                      unoptimized={item.url.startsWith("data:")}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.filename}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.width && item.height ? `${item.width}×${item.height} · ` : ""}{formatBytes(item.size)}
                      {item.format ? ` · ${item.format.toUpperCase()}` : ""}
                    </p>
                  </div>
                  {selected === item.url && (
                    <div className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between border-t px-5 py-4">
          <p className="text-sm text-muted-foreground">
            {selected ? "1 görsel seçildi" : "Görsel seçilmedi"}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose}>İptal</Button>
            <Button onClick={handleConfirm} disabled={!selected}>
              <Check className="mr-1.5 h-4 w-4" />
              Seç ve Uygula
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
