"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageExtension from "@tiptap/extension-image";
import LinkExtension from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CATEGORIES } from "@/lib/utils/constants";
import { generateImageViaApi } from "@/lib/ai/generate-image-client";
import { MediaPickerModal } from "@/components/admin/MediaPickerModal";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Heading2,
  Heading3,
  ImageIcon,
  LinkIcon,
  Undo,
  Redo,
  Save,
  Send,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Sparkles,
  Loader2,
  Link2,
  X,
} from "lucide-react";
import Link from "next/link";

export default function NewArticlePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [spot, setSpot] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [tags, setTags] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [generatingImage, setGeneratingImage] = useState(false);
  const [imageError, setImageError] = useState("");
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [saving, setSaving] = useState<"draft" | "publish" | null>(null);
  const [error, setError] = useState("");

  // URL'den AI üretimi
  const [showUrlPanel, setShowUrlPanel] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [generatingFromUrl, setGeneratingFromUrl] = useState(false);
  const [urlError, setUrlError] = useState("");

  async function handleGenerateFromUrl() {
    setUrlError("");
    const url = urlInput.trim();
    if (!url || !/^https?:\/\/.+/.test(url)) {
      setUrlError("Geçerli bir URL girin (https://...)");
      return;
    }
    setGeneratingFromUrl(true);
    try {
      const res = await fetch("/api/admin/generate-from-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) {
        setUrlError(data.error || "Üretim başarısız.");
        return;
      }
      const a = data.article;
      setTitle(a.title ?? "");
      setSpot(a.spot ?? "");
      setCategoryId(a.category ?? "");
      setTags(Array.isArray(a.tags) ? a.tags.join(", ") : "");
      setSeoTitle(a.seoTitle ?? "");
      setSeoDescription(a.seoDescription ?? "");
      editor?.commands.setContent(a.content ?? "");
      setShowUrlPanel(false);
      setUrlInput("");
    } catch {
      setUrlError("Bağlantı hatası. Tekrar deneyin.");
    } finally {
      setGeneratingFromUrl(false);
    }
  }

  async function handleGenerateImage() {
    setImageError("");
    if (title.trim().length < 3) {
      setImageError("Önce bir başlık girin (en az 3 karakter).");
      return;
    }
    setGeneratingImage(true);
    try {
      const { imageUrl } = await generateImageViaApi({
        title: title.trim(),
        category: categoryId || "gundem",
        purpose: "cover",
      });
      setCoverImage(imageUrl);
    } catch (err) {
      setImageError(
        err instanceof Error ? err.message : "Görsel üretilemedi.",
      );
    } finally {
      setGeneratingImage(false);
    }
  }

  const editor = useEditor({
    extensions: [
      StarterKit,
      ImageExtension,
      LinkExtension.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: "Haber içeriğini yazmaya başlayın..." }),
    ],
    content: "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-lg max-w-none dark:prose-invert min-h-[400px] px-4 py-3 focus:outline-none prose-p:text-foreground prose-headings:text-foreground prose-strong:text-foreground prose-li:text-foreground prose-blockquote:text-foreground/80 text-foreground",
      },
    },
  });

  const seoScore = calculateSeoScore({ title, spot, seoTitle, seoDescription });

  async function handleSave(status: "DRAFT" | "PUBLISHED") {
    setError("");
    const content = editor?.getHTML() || "";

    if (title.trim().length < 3) {
      setError("Başlık en az 3 karakter olmalı.");
      return;
    }
    if (!content || content === "<p></p>") {
      setError("Haber içeriği boş olamaz.");
      return;
    }

    setSaving(status === "PUBLISHED" ? "publish" : "draft");
    try {
      const res = await fetch("/api/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          spot: spot.trim() || undefined,
          content,
          categorySlug: categoryId || undefined,
          coverImage: coverImage.trim() || undefined,
          seoTitle: seoTitle.trim() || undefined,
          seoDescription: seoDescription.trim() || undefined,
          status,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error || "Haber kaydedilemedi.");
        setSaving(null);
        return;
      }

      router.push("/admin/haberler");
      router.refresh();
    } catch {
      setError("Bağlantı hatası. Lütfen tekrar deneyin.");
      setSaving(null);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/haberler">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">Yeni Haber</h1>
            <p className="text-sm text-muted-foreground">Haber oluşturun ve yayınlayın</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowUrlPanel((v) => !v)}
            className="gap-2"
          >
            <Link2 className="h-4 w-4" />
            URL&apos;den AI Üret
          </Button>
          <Button
            variant="outline"
            onClick={() => handleSave("DRAFT")}
            disabled={saving !== null}
          >
            <Save className="h-4 w-4" />
            {saving === "draft" ? "Kaydediliyor..." : "Taslak Kaydet"}
          </Button>
          <Button onClick={() => handleSave("PUBLISHED")} disabled={saving !== null}>
            <Send className="h-4 w-4" />
            {saving === "publish" ? "Yayınlanıyor..." : "Yayınla"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-md bg-red-500/10 px-4 py-2.5 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* URL'den AI Üretim Paneli */}
      {showUrlPanel && (
        <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">
                Haber URL&apos;sinden AI ile Üret
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                NTV, Hürriyet, Sabah, AA, TRT gibi haber sitelerinin linkini yapıştırın.
                AI, o haberi okuyup özgün bir Türkçe haber yazacak.
              </p>
              <div className="mt-3 flex gap-2">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => { setUrlInput(e.target.value); setUrlError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handleGenerateFromUrl()}
                  placeholder="https://www.ntv.com.tr/haber/..."
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={generatingFromUrl}
                />
                <Button
                  onClick={handleGenerateFromUrl}
                  disabled={generatingFromUrl || !urlInput.trim()}
                  className="shrink-0"
                >
                  {generatingFromUrl ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Üretiliyor...</>
                  ) : (
                    <><Sparkles className="h-4 w-4" /> Üret</>
                  )}
                </Button>
              </div>
              {urlError && <p className="mt-2 text-xs text-red-500">{urlError}</p>}
              {generatingFromUrl && (
                <p className="mt-2 text-xs text-muted-foreground animate-pulse">
                  Sayfa okunuyor ve AI haber yazıyor… (20-40 sn sürebilir)
                </p>
              )}
            </div>
            <button
              onClick={() => { setShowUrlPanel(false); setUrlInput(""); setUrlError(""); }}
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        {/* Main Editor */}
        <div className="xl:col-span-2 space-y-6">
          {/* Title */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Haber başlığı..."
            className="w-full border-0 bg-transparent text-2xl font-bold placeholder:text-muted-foreground/50 focus:outline-none"
          />

          {/* Spot */}
          <textarea
            value={spot}
            onChange={(e) => setSpot(e.target.value)}
            placeholder="Haber spotu (160 karakter)..."
            rows={2}
            maxLength={200}
            className="w-full resize-none border-0 bg-transparent text-base text-muted-foreground placeholder:text-muted-foreground/50 focus:outline-none"
          />

          {/* Editor Toolbar */}
          <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-card p-2">
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleBold().run()}
              active={editor?.isActive("bold")}
              icon={<Bold className="h-4 w-4" />}
            />
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              active={editor?.isActive("italic")}
              icon={<Italic className="h-4 w-4" />}
            />
            <div className="mx-1 h-6 w-px bg-border" />
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
              active={editor?.isActive("heading", { level: 2 })}
              icon={<Heading2 className="h-4 w-4" />}
            />
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
              active={editor?.isActive("heading", { level: 3 })}
              icon={<Heading3 className="h-4 w-4" />}
            />
            <div className="mx-1 h-6 w-px bg-border" />
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              active={editor?.isActive("bulletList")}
              icon={<List className="h-4 w-4" />}
            />
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              active={editor?.isActive("orderedList")}
              icon={<ListOrdered className="h-4 w-4" />}
            />
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleBlockquote().run()}
              active={editor?.isActive("blockquote")}
              icon={<Quote className="h-4 w-4" />}
            />
            <div className="mx-1 h-6 w-px bg-border" />
            <ToolbarButton
              onClick={() => {
                const url = prompt("Görsel URL:");
                if (url) editor?.chain().focus().setImage({ src: url }).run();
              }}
              icon={<ImageIcon className="h-4 w-4" />}
            />
            <ToolbarButton
              onClick={() => {
                const url = prompt("Link URL:");
                if (url) editor?.chain().focus().setLink({ href: url }).run();
              }}
              active={editor?.isActive("link")}
              icon={<LinkIcon className="h-4 w-4" />}
            />
            <div className="mx-1 h-6 w-px bg-border" />
            <ToolbarButton
              onClick={() => editor?.chain().focus().undo().run()}
              icon={<Undo className="h-4 w-4" />}
            />
            <ToolbarButton
              onClick={() => editor?.chain().focus().redo().run()}
              icon={<Redo className="h-4 w-4" />}
            />
          </div>

          {/* Editor Content */}
          <Card>
            <CardContent className="p-0">
              <EditorContent editor={editor} />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* SEO Score */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                SEO Skoru
                <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-bold ${
                  seoScore >= 80 ? "bg-emerald-500/10 text-emerald-600" :
                  seoScore >= 50 ? "bg-amber-500/10 text-amber-600" :
                  "bg-red-500/10 text-red-600"
                }`}>
                  {seoScore}/100
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <SeoCheck passed={title.length >= 30 && title.length <= 70} label="Başlık uzunluğu (30-70 karakter)" />
              <SeoCheck passed={spot.length >= 80 && spot.length <= 160} label="Spot uzunluğu (80-160 karakter)" />
              <SeoCheck passed={!!categoryId} label="Kategori seçildi" />
              <SeoCheck passed={tags.split(",").filter(Boolean).length >= 2} label="En az 2 etiket" />
            </CardContent>
          </Card>

          {/* Cover Image */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Kapak Görseli</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coverImage}
                  alt="Kapak önizleme"
                  className="aspect-video w-full rounded-md border border-border object-cover"
                />
              ) : (
                <div className="flex aspect-video w-full items-center justify-center rounded-md border border-dashed border-border bg-muted/30 text-xs text-muted-foreground">
                  Görsel yok
                </div>
              )}

              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={handleGenerateImage}
                disabled={generatingImage}
              >
                {generatingImage ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Üretiliyor... (~15 sn)
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    AI ile Görsel Üret
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setShowMediaPicker(true)}
              >
                <ImageIcon className="h-4 w-4" />
                Kütüphaneden Seç
              </Button>

              <input
                type="url"
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                placeholder="veya görsel URL yapıştırın"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
              />

              {imageError && (
                <p className="text-xs text-red-500">{imageError}</p>
              )}
            </CardContent>
          </Card>

          {/* Media Picker Modal */}
          <MediaPickerModal
            open={showMediaPicker}
            onClose={() => setShowMediaPicker(false)}
            onSelect={(url) => { setCoverImage(url); setImageError(""); }}
          />

          {/* Category */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Kategori</CardTitle>
            </CardHeader>
            <CardContent>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Kategori seçin...</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat.slug} value={cat.slug}>{cat.name}</option>
                ))}
              </select>
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Etiketler</CardTitle>
            </CardHeader>
            <CardContent>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Virgülle ayırın: gündem, ekonomi"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </CardContent>
          </Card>

          {/* SEO Override */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">SEO Ayarları</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">SEO Başlık</label>
                <input
                  type="text"
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  placeholder={title || "Otomatik başlıktan alınır"}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">SEO Açıklama</label>
                <textarea
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  placeholder={spot || "Otomatik spottan alınır"}
                  rows={3}
                  className="mt-1 w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ToolbarButton({
  onClick,
  active,
  icon,
}: {
  onClick: () => void;
  active?: boolean;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded p-1.5 transition-colors ${
        active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {icon}
    </button>
  );
}

function SeoCheck({ passed, label }: { passed: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {passed ? (
        <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
      ) : (
        <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
      )}
      <span className={passed ? "text-foreground" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}

function calculateSeoScore(data: { title: string; spot: string; seoTitle: string; seoDescription: string }): number {
  let score = 0;
  if (data.title.length >= 30 && data.title.length <= 70) score += 30;
  else if (data.title.length > 0) score += 10;
  if (data.spot.length >= 80 && data.spot.length <= 160) score += 30;
  else if (data.spot.length > 0) score += 10;
  if (data.seoTitle || data.title) score += 20;
  if (data.seoDescription || data.spot) score += 20;
  return score;
}
