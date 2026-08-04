"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, Loader2, ExternalLink } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

interface AiSource {
  index: number;
  title: string;
  url: string;
  category: string;
  publishedAt: string | null;
}

interface AiAnswer {
  answer: string;
  sources: AiSource[];
}

/** Cevap metnindeki [1] [2] atıflarını kaynak linklerine dönüştürür. */
function renderAnswer(answer: string, sources: AiSource[]) {
  const parts = answer.split(/(\[\d+\])/g);
  return parts.map((part, i) => {
    const match = part.match(/^\[(\d+)\]$/);
    if (match) {
      const source = sources.find((s) => s.index === Number(match[1]));
      if (source) {
        return (
          <Link
            key={i}
            href={source.url}
            className="mx-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary/15 align-super text-[10px] font-bold text-primary hover:bg-primary/25"
            title={source.title}
          >
            {source.index}
          </Link>
        );
      }
    }
    return <span key={i}>{part}</span>;
  });
}

export function AiSearchPanel({ query }: { query: string }) {
  const [state, setState] = useState<
    | { status: "idle" }
    | { status: "loading" }
    | { status: "done"; data: AiAnswer | null; message?: string }
    | { status: "error" }
  >({ status: "idle" });

  async function ask() {
    setState({ status: "loading" });
    trackEvent("ai_search", { search_term: query });
    try {
      const res = await fetch(`/api/ai-search?q=${encodeURIComponent(query)}`);
      const json = await res.json();
      if (!res.ok) {
        setState({ status: "error" });
        return;
      }
      setState({ status: "done", data: json.data ?? null, message: json.message });
    } catch {
      setState({ status: "error" });
    }
  }

  if (query.trim().length < 3) return null;

  return (
    <div className="mt-6 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">AI Özet</span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            Arşive dayalı
          </span>
        </div>
        {state.status !== "loading" && state.status !== "done" && (
          <button
            onClick={ask}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            AI ile Sor
          </button>
        )}
      </div>

      {state.status === "loading" && (
        <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Arşiv taranıyor ve cevap hazırlanıyor...
        </div>
      )}

      {state.status === "error" && (
        <p className="mt-3 text-sm text-muted-foreground">
          AI özet şu anda oluşturulamadı. Lütfen daha sonra tekrar deneyin.
        </p>
      )}

      {state.status === "done" && !state.data && (
        <p className="mt-3 text-sm text-muted-foreground">
          {state.message ?? "Arşivde bu soruyla ilgili yeterli içerik bulunamadı."}
        </p>
      )}

      {state.status === "done" && state.data && (
        <div className="mt-3">
          <p className="text-sm leading-relaxed">
            {renderAnswer(state.data.answer, state.data.sources)}
          </p>
          <div className="mt-3 space-y-1.5 border-t border-border/60 pt-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Kaynaklar
            </p>
            {state.data.sources.map((source) => (
              <Link
                key={source.index}
                href={source.url}
                className="group flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
                  {source.index}
                </span>
                <span className="line-clamp-1 group-hover:underline">
                  {source.title}
                </span>
                <ExternalLink className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground/70">
            Bu cevap yapay zekâ tarafından Son Bir Söz arşivindeki haberlerden üretilmiştir.
          </p>
        </div>
      )}
    </div>
  );
}
