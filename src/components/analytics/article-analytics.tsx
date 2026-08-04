"use client";

import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/analytics";

interface ArticleAnalyticsProps {
  articleId: string;
  title: string;
  category: string;
}

const DEPTHS = [25, 50, 75, 100] as const;

/**
 * Makale okuma ölçümü: scroll derinliği (25/50/75/100) ve okuma tamamlama.
 * Görünmez bileşen — makale sayfasına eklenir.
 */
export function ArticleAnalytics({ articleId, title, category }: ArticleAnalyticsProps) {
  const fired = useRef<Set<number>>(new Set());
  const startedAt = useRef(0);

  useEffect(() => {
    startedAt.current = Date.now();
    trackEvent("article_view", { item_id: articleId, item_category: category, item_name: title });

    const onScroll = () => {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;
      const pct = Math.round((window.scrollY / scrollable) * 100);
      for (const depth of DEPTHS) {
        if (pct >= depth && !fired.current.has(depth)) {
          fired.current.add(depth);
          trackEvent("scroll_depth", {
            item_id: articleId,
            percent: depth,
            item_category: category,
          });
          if (depth === 100) {
            trackEvent("article_read_complete", {
              item_id: articleId,
              read_seconds: Math.round((Date.now() - startedAt.current) / 1000),
            });
          }
        }
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [articleId, title, category]);

  return null;
}
