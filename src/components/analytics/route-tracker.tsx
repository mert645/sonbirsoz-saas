"use client";

import { useEffect, useRef, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { trackPageView } from "@/lib/analytics";

function RouteTrackerInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    const qs = searchParams.toString();
    const full = qs ? `${pathname}?${qs}` : pathname;
    // İlk yükleme gtag config tarafından zaten ölçülür; sadece SPA geçişlerini gönder
    if (lastPath.current !== null && lastPath.current !== full) {
      trackPageView(full);
    }
    lastPath.current = full;
  }, [pathname, searchParams]);

  return null;
}

/** App Router SPA navigasyonlarında page_view gönderir. */
export function RouteTracker() {
  return (
    <Suspense fallback={null}>
      <RouteTrackerInner />
    </Suspense>
  );
}
