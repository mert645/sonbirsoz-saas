"use client";

/**
 * GA4 event yardımcıları — gtag yüklenmemişse sessizce no-op.
 * Sunucu tarafında import edilirse hata vermez (window kontrolü var).
 */
type GtagFn = (...args: unknown[]) => void;

function getGtag(): GtagFn | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { gtag?: GtagFn }).gtag;
}

export function trackEvent(name: string, params?: Record<string, unknown>) {
  getGtag()?.("event", name, params ?? {});
}

export function trackPageView(path: string, title?: string) {
  getGtag()?.("event", "page_view", {
    page_path: path,
    page_title: title ?? document.title,
    page_location: window.location.href,
  });
}
