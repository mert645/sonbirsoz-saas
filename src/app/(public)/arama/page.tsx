"use client";

import { useState, useEffect, useCallback } from "react";
import { Search as SearchIcon, Loader2 } from "lucide-react";
import { ArticleCard } from "@/components/article/article-card";
import { AiSearchPanel } from "@/components/shared/ai-search-panel";
import { CATEGORIES } from "@/lib/utils/constants";
import { trackEvent } from "@/lib/analytics";

interface SearchResult {
  id: string;
  title: string;
  slug: string;
  spot: string | null;
  coverImage: string | null;
  publishedAt: string | null;
  readingTime: number;
  category: { name: string; slug: string; color: string };
  author: { name: string; slug: string };
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const runSearch = useCallback(async (q: string, category: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ q });
      if (category !== "all") params.set("category", category);
      const res = await fetch(`/api/search?${params.toString()}`);
      const json = await res.json();
      setResults(Array.isArray(json.data) ? json.data : []);
      trackEvent("search", { search_term: q, category });
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  }, []);

  // Debounced search on query/category change.
  useEffect(() => {
    const t = setTimeout(() => {
      runSearch(query, selectedCategory);
    }, 300);
    return () => clearTimeout(t);
  }, [query, selectedCategory, runSearch]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <h1 className="text-2xl font-bold">Haber Ara</h1>
      <p className="mt-1 text-muted-foreground">Tüm haberlerde arama yapın</p>

      {/* Search Input */}
      <div className="mt-6 relative">
        <SearchIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Haber başlığı, konu veya anahtar kelime yazın..."
          className="w-full rounded-xl border border-border bg-card py-4 pl-12 pr-12 text-lg focus:outline-none focus:ring-2 focus:ring-primary"
          autoFocus
        />
        {loading && (
          <Loader2 className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Category Filter */}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory("all")}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            selectedCategory === "all"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          Tümü
        </button>
        {CATEGORIES.slice(0, 8).map((cat) => (
          <button
            key={cat.slug}
            onClick={() => setSelectedCategory(cat.slug)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              selectedCategory === cat.slug
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* AI Özet paneli */}
      <AiSearchPanel key={query.trim().toLowerCase()} query={query} />

      {/* Results */}
      {query.trim().length >= 2 && searched && !loading && (
        <div className="mt-8">
          <p className="mb-4 text-sm text-muted-foreground">
            <strong>&ldquo;{query}&rdquo;</strong> için {results.length} sonuç
            bulundu
          </p>
          {results.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((article) => (
                <ArticleCard
                  key={article.id}
                  title={article.title}
                  slug={article.slug}
                  spot={article.spot}
                  coverImage={article.coverImage}
                  publishedAt={article.publishedAt ?? new Date().toISOString()}
                  readingTime={article.readingTime}
                  category={article.category}
                  author={article.author}
                />
              ))}
            </div>
          ) : (
            <div className="mt-12 text-center">
              <SearchIcon className="mx-auto h-12 w-12 text-muted-foreground/30" />
              <p className="mt-4 text-muted-foreground">
                Aramanızla eşleşen haber bulunamadı.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {query.trim().length < 2 && (
        <div className="mt-16 text-center">
          <SearchIcon className="mx-auto h-12 w-12 text-muted-foreground/30" />
          <p className="mt-4 text-muted-foreground">
            Aramak istediğiniz konuyu yukarıya yazın (en az 2 karakter)
          </p>
        </div>
      )}
    </div>
  );
}
