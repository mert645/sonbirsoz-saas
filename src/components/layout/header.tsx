"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { Menu, X, Search, Sun, Moon, TrendingUp, TrendingDown } from "lucide-react";
import { NAV_ITEMS, SITE_NAME } from "@/lib/utils/constants";
import { cn } from "@/lib/utils";

interface MarketItem {
  name: string;
  value: string;
  change: number;
}

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [marketData, setMarketData] = useState<MarketItem[]>([]);

  const fetchMarket = useCallback(async () => {
    try {
      const res = await fetch("/api/market", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.items) && data.items.length > 0) {
          setMarketData(data.items);
        }
      }
    } catch { /* sessizce yoksay */ }
  }, []);

  useEffect(() => {
    fetchMarket();
    const id = setInterval(fetchMarket, 10 * 60 * 1000); // 10 dakikada bir yenile
    const onFocus = () => {
      if (document.visibilityState === "visible") fetchMarket();
    };
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchMarket]);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "dark") {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDark(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDark(true);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-background">
      {/* Market Ticker */}
      <div className="border-b bg-muted/40 dark:bg-muted/20">
        <div className="mx-auto flex h-7 max-w-[1200px] items-center justify-between px-5">
          <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide">
            {marketData.length === 0 ? (
              // Yüklenene kadar statik placeholder göster
              [
                { name: "DOLAR", value: "—" },
                { name: "EURO", value: "—" },
                { name: "STERLİN", value: "—" },
                { name: "ALTIN", value: "—" },
                { name: "GÜMÜŞ", value: "—" },
                { name: "BTC", value: "—" },
              ].map((item) => (
                <div key={item.name} className="flex items-center gap-1 whitespace-nowrap">
                  <span className="text-[10px] font-medium text-muted-foreground">{item.name}</span>
                  <span className="h-2.5 w-10 animate-pulse rounded bg-muted-foreground/20" />
                </div>
              ))
            ) : (
              marketData.map((item) => (
                <div key={item.name} className="flex items-center gap-1 whitespace-nowrap">
                  <span className="text-[10px] font-medium text-muted-foreground">{item.name}</span>
                  <span className="text-[10px] font-bold text-foreground">{item.value}</span>
                  <span className={cn(
                    "flex items-center text-[10px] font-semibold",
                    item.change >= 0 ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"
                  )}>
                    {item.change >= 0 ? <TrendingUp className="mr-0.5 h-2.5 w-2.5" /> : <TrendingDown className="mr-0.5 h-2.5 w-2.5" />}
                    %{Math.abs(item.change).toFixed(2)}
                  </span>
                </div>
              ))
            )}
          </div>
          <time className="hidden shrink-0 text-[10px] text-muted-foreground lg:block">
            {new Date().toLocaleDateString("tr-TR", {
              day: "numeric",
              month: "long",
              year: "numeric",
              weekday: "long",
            })}
          </time>
        </div>
      </div>

      {/* Main Header */}
      <div className="border-b">
        <div className="mx-auto flex h-[52px] max-w-[1200px] items-center justify-between px-5">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <img
              src="/icons/icon-128.png"
              alt={SITE_NAME}
              className="h-8 w-8 rounded bg-white object-cover"
            />
            <div className="flex flex-col">
              <span className="text-[16px] font-extrabold leading-tight tracking-tight text-foreground">
                Son Bir Söz
              </span>
              <span className="hidden text-[9px] font-medium uppercase tracking-[0.15em] text-muted-foreground sm:block">
                Doğru, güvenilir ve tarafsız habercilik
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center lg:flex">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.slug}
                href={`/${item.slug}`}
                className="px-3 py-1.5 text-[13px] font-medium text-foreground/80 transition-colors hover:text-primary"
              >
                {item.name}
              </Link>
            ))}
            <Link
              href="/video"
              className="px-3 py-1.5 text-[13px] font-medium text-foreground/80 transition-colors hover:text-primary"
            >
              Video
            </Link>
            <Link
              href="/foto-galeri"
              className="px-3 py-1.5 text-[13px] font-medium text-foreground/80 transition-colors hover:text-primary"
            >
              Foto Galeri
            </Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-0.5">
            <Link
              href="/arama"
              className="flex h-8 w-8 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Arama"
            >
              <Search className="h-[16px] w-[16px]" />
            </Link>

            <button
              onClick={toggleTheme}
              className="flex h-8 w-8 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Tema değiştir"
            >
              {isDark ? <Sun className="h-[16px] w-[16px]" /> : <Moon className="h-[16px] w-[16px]" />}
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-8 w-8 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground lg:hidden"
              aria-label="Menü"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div
        className={cn(
          "overflow-hidden border-b bg-background transition-all duration-200 lg:hidden",
          mobileMenuOpen ? "max-h-[400px]" : "max-h-0 border-b-0"
        )}
      >
        <nav className="mx-auto max-w-[1200px] p-4">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.slug}
              href={`/${item.slug}`}
              className="block rounded px-4 py-2.5 text-[14px] font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
              onClick={() => setMobileMenuOpen(false)}
            >
              {item.name}
            </Link>
          ))}
          <Link
            href="/video"
            className="block rounded px-4 py-2.5 text-[14px] font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
            onClick={() => setMobileMenuOpen(false)}
          >
            Video
          </Link>
          <Link
            href="/foto-galeri"
            className="block rounded px-4 py-2.5 text-[14px] font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
            onClick={() => setMobileMenuOpen(false)}
          >
            Foto Galeri
          </Link>
        </nav>
      </div>
    </header>
  );
}
