"use client";

import Script from "next/script";

interface AdSlotProps {
  slot: "header" | "sidebar" | "in-article" | "footer";
  className?: string;
}

export function AdSlot({ slot, className = "" }: AdSlotProps) {
  const sizes: Record<string, { width: number; height: number; label: string }> = {
    header: { width: 728, height: 90, label: "Leaderboard" },
    sidebar: { width: 300, height: 250, label: "Rectangle" },
    "in-article": { width: 728, height: 90, label: "In-Article" },
    footer: { width: 970, height: 90, label: "Billboard" },
  };

  const size = sizes[slot];

  return (
    <div
      className={`flex items-center justify-center rounded border border-dashed border-border bg-muted/30 ${className}`}
      style={{ minHeight: size.height, maxWidth: size.width }}
      data-ad-slot={slot}
      aria-label={`Reklam alanı: ${size.label}`}
    >
      <span className="text-xs text-muted-foreground">
        AD — {size.label} ({size.width}x{size.height})
      </span>
    </div>
  );
}

export function GoogleAnalytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  if (!gaId) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id="gtag-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}', {
            page_path: window.location.pathname,
          });
        `}
      </Script>
    </>
  );
}
