"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Video,
  Upload,
  Download,
  Search as SearchIcon,
  Clapperboard,
} from "lucide-react";

interface VideoJob {
  id: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  prompt: string;
  resultUrl: string | null;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
  article: {
    id: string;
    title: string;
    slug: string;
    coverImage: string | null;
  } | null;
}

interface ArticleOption {
  id: string;
  title: string;
  coverImage: string | null;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("tr-TR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export default function VideoPage() {
  const [jobs, setJobs] = useState<VideoJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [youtubeConfigured, setYoutubeConfigured] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Makale arama
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<ArticleOption[]>([]);
  const [searching, setSearching] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/video");
      if (!res.ok) return;
      const json = await res.json();
      setJobs(json.data || []);
      setConfigured(json.configured ?? true);
      setYoutubeConfigured(json.youtubeConfigured ?? false);
    } catch {
      // mevcut liste korunur
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Makale arama (debounced)
  useEffect(() => {
    if (query.trim().length < 2) {
      setOptions([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const json = await res.json();
        const items = Array.isArray(json.data) ? json.data : [];
        setOptions(
          items.slice(0, 6).map((a: { id: string; title: string; coverImage: string | null }) => ({
            id: a.id,
            title: a.title,
            coverImage: a.coverImage,
          }))
        );
      } catch {
        setOptions([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  async function generateVideo(articleId: string) {
    setGeneratingId(articleId);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage({ type: "err", text: json.error || "Video üretilemedi" });
      } else {
        setMessage({ type: "ok", text: "Video üretildi. Önizleyip YouTube'a yükleyebilirsiniz." });
        setQuery("");
        setOptions([]);
      }
      await load();
    } catch {
      setMessage({ type: "err", text: "Video üretimi sırasında hata oluştu" });
    } finally {
      setGeneratingId(null);
    }
  }

  async function uploadToYouTube(jobId: string) {
    setUploadingId(jobId);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, action: "youtube" }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage({ type: "err", text: json.error || "YouTube yüklemesi başarısız" });
      } else {
        setMessage({ type: "ok", text: `YouTube Shorts yayında: ${json.youtube?.url ?? ""}` });
      }
    } catch {
      setMessage({ type: "err", text: "YouTube yüklemesi sırasında hata oluştu" });
    } finally {
      setUploadingId(null);
    }
  }

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold">Video Stüdyosu</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Haber görselinden Ken Burns efektli, Polly seslendirmeli 9:16 dikey video
          (Shorts/TikTok/Reels) üretin. Önizledikten sonra YouTube Shorts&apos;a
          yükleyin; TikTok ve Instagram Reels için videoyu indirip paylaşın.
        </p>
      </div>

      {!configured && (
        <div className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          Video pipeline yapılandırılmamış — AWS kimlik bilgileri (Polly/S3) ve ffmpeg gerekli.
        </div>
      )}

      {message && (
        <div
          className={`mt-4 rounded-lg border p-3 text-sm ${
            message.type === "ok"
              ? "border-emerald-500/40 bg-emerald-500/10"
              : "border-red-500/40 bg-red-500/10"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Makale seç + üret */}
      <Card className="mt-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Clapperboard className="h-4 w-4 text-primary" />
            Yeni Video Üret
          </div>
          <div className="relative mt-3">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Video üretilecek haberi arayın..."
              className="w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>
          {options.length > 0 && (
            <div className="mt-2 divide-y rounded-lg border">
              {options.map((option) => (
                <div key={option.id} className="flex items-center gap-3 p-2.5">
                  {option.coverImage ? (
                    <Image
                      src={option.coverImage}
                      alt=""
                      width={56}
                      height={36}
                      className="h-9 w-14 rounded object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-9 w-14 items-center justify-center rounded bg-muted">
                      <Video className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <span className="line-clamp-1 flex-1 text-sm">{option.title}</span>
                  <Button
                    size="sm"
                    disabled={!option.coverImage || generatingId === option.id}
                    title={!option.coverImage ? "Kapak görseli olmayan haber için video üretilemez" : undefined}
                    onClick={() => generateVideo(option.id)}
                  >
                    {generatingId === option.id ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Üretiliyor…
                      </>
                    ) : (
                      "Videoyu Üret"
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            Üretim yaklaşık 30-90 saniye sürer (görsel indirme + seslendirme + render).
          </p>
        </CardContent>
      </Card>

      {/* İş listesi */}
      <Card className="mt-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Video className="h-4 w-4 text-primary" />
            Üretilen Videolar
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Yükleniyor…
            </div>
          ) : jobs.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Henüz video üretilmedi.
            </div>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {jobs.map((job) => (
                <div key={job.id} className="overflow-hidden rounded-xl border">
                  {job.resultUrl ? (
                    <video
                      src={job.resultUrl}
                      controls
                      preload="metadata"
                      className="aspect-[9/16] max-h-80 w-full bg-black object-contain"
                    />
                  ) : (
                    <div className="flex aspect-[9/16] max-h-80 w-full items-center justify-center bg-muted">
                      <Video className="h-8 w-8 text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="space-y-2 p-3">
                    <p className="line-clamp-2 text-sm font-medium">
                      {job.article?.title ?? job.prompt}
                    </p>
                    <div className="flex items-center gap-2">
                      {job.status === "COMPLETED" && <Badge variant="success">Hazır</Badge>}
                      {job.status === "FAILED" && <Badge variant="breaking">Hata</Badge>}
                      {(job.status === "PENDING" || job.status === "PROCESSING") && (
                        <Badge variant="warning">İşleniyor</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDate(job.createdAt)}
                      </span>
                    </div>
                    {job.error && (
                      <p className="text-xs text-red-500">{job.error}</p>
                    )}
                    {job.status === "COMPLETED" && job.resultUrl && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button
                          size="sm"
                          disabled={!youtubeConfigured || uploadingId === job.id}
                          title={
                            !youtubeConfigured
                              ? "YouTube OAuth env değişkenleri tanımlanmalı"
                              : undefined
                          }
                          onClick={() => uploadToYouTube(job.id)}
                        >
                          {uploadingId === job.id ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Upload className="mr-1.5 h-3.5 w-3.5" />
                          )}
                          YouTube Shorts
                        </Button>
                        <a
                          href={job.resultUrl}
                          download
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                        >
                          <Download className="mr-1.5 h-3.5 w-3.5" />
                          İndir (TikTok/Reels)
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
