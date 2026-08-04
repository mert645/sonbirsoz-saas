import { NextResponse } from "next/server";
import type { ArticleListItem } from "@/lib/data/articles";

/**
 * Mobil BFF (Backend-for-Frontend) API v1 — ortak yardımcılar.
 *
 * Flutter/SmartTV/Smartwatch istemcileri bu endpoint'leri kullanır.
 * Sözleşme: docs/apps-roadmap.md — kırıcı değişiklik yapılamaz,
 * gerekirse /api/v2 açılır.
 */

export interface ApiV1Article {
  id: string;
  title: string;
  slug: string;
  spot: string | null;
  coverImage: string | null;
  publishedAt: string | null;
  readingTime: number;
  category: { name: string; slug: string; color: string };
  author: { name: string; slug: string; avatar: string | null };
  /** İstemcinin tarayıcıda açabileceği kanonik web URL'i */
  webUrl: string;
}

export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://www.sonbirsoz.com";
}

export function toApiArticle(article: ArticleListItem): ApiV1Article {
  return {
    id: article.id,
    title: article.title,
    slug: article.slug,
    spot: article.spot,
    coverImage: article.coverImage,
    publishedAt: article.publishedAt
      ? new Date(article.publishedAt).toISOString()
      : null,
    readingTime: article.readingTime,
    category: article.category,
    author: article.author,
    webUrl: `${getSiteUrl()}/${article.category.slug}/${article.slug}`,
  };
}

/** Standart v1 cevabı: { data, meta? } + CDN cache header'ları */
export function v1Json<T>(
  data: T,
  {
    meta,
    maxAge = 60,
    staleWhileRevalidate = 300,
  }: {
    meta?: Record<string, unknown>;
    maxAge?: number;
    staleWhileRevalidate?: number;
  } = {}
) {
  return NextResponse.json(
    meta ? { data, meta } : { data },
    {
      headers: {
        "Cache-Control": `public, s-maxage=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`,
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
}

export function v1Error(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    { status, headers: { "Access-Control-Allow-Origin": "*" } }
  );
}
