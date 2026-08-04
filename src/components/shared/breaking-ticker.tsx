"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Flame } from "lucide-react";

interface TickerItem {
  text: string;
  href: string | null;
  critical: boolean;
}

interface BreakingTickerProps {
  /** Sunucudan gelen ilk öğeler (boş flash önlemek için). */
  initialItems: { text: string; href?: string | null; critical?: boolean }[];
}

const REFRESH_MS = 5 * 60 * 1000;

/**
 * Kayan Son Dakika şeridi. İlk render sunucu verisiyle gelir,
 * ardından 5 dakikada bir /api/breaking üzerinden tazelenir.
 */
export function BreakingTicker({ initialItems }: BreakingTickerProps) {
  const [items, setItems] = useState<TickerItem[]>(
    initialItems.map((i) => ({
      text: i.text,
      href: i.href ?? null,
      critical: i.critical ?? false,
    }))
  );

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const res = await fetch("/api/breaking");
        if (!res.ok) return;
        const json = (await res.json()) as { items?: TickerItem[] };
        if (!cancelled && json.items && json.items.length > 0) {
          setItems(json.items);
        }
      } catch {
        // ağ hatasında mevcut öğeler kalır
      }
    }

    refresh();
    const t = setInterval(refresh, REFRESH_MS);

    // Sekme öne gelince tazele
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (items.length === 0) return null;

  const doubled = [...items, ...items];

  return (
    <div className="border-b bg-[#c00000] dark:bg-[#7f1d1d]">
      <div className="mx-auto flex h-8 max-w-[1200px] items-center gap-3 px-5">
        <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-white">
          <Flame className="h-3 w-3" /> Son Dakika
        </span>
        <div className="h-4 w-px bg-white/30" />
        <div className="flex-1 overflow-hidden">
          <div className="animate-ticker flex gap-12 whitespace-nowrap">
            {doubled.map((item, i) =>
              item.href ? (
                <Link
                  key={i}
                  href={item.href}
                  className="text-[12px] font-medium text-white/90 hover:text-white hover:underline"
                >
                  {item.critical && <span className="mr-1 font-bold">⚡</span>}
                  {item.text}
                </Link>
              ) : (
                <span key={i} className="text-[12px] font-medium text-white/90">
                  {item.critical && <span className="mr-1 font-bold">⚡</span>}
                  {item.text}
                </span>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
