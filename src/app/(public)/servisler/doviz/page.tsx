"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, RefreshCw } from "lucide-react";

interface RateRow {
  code: string;
  name: string;
  value: number;
  change: number;
}

interface GoldRow {
  name: string;
  value: number;
  change: number;
}

const CURRENCY_NAMES: Record<string, string> = {
  DOLAR:   "Amerikan Doları",
  EURO:    "Euro",
  "STERLİN": "İngiliz Sterlini",
};

const GOLD_NAMES: Record<string, string> = {
  ALTIN: "Gram Altın",
  "GÜMÜŞ": "Gram Gümüş",
};

function fmt(v: number, decimals = 2) {
  return v.toLocaleString("tr-TR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function ChangeCell({ change }: { change: number }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-sm font-medium ${change >= 0 ? "text-emerald-500" : "text-red-500"}`}
    >
      {change >= 0 ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      %{Math.abs(change).toFixed(2)}
    </span>
  );
}

function SkeletonRows({ n }: { n: number }) {
  return (
    <>
      {Array.from({ length: n }).map((_, i) => (
        <tr key={i} className="border-b last:border-0">
          {[1, 2, 3, 4].map((c) => (
            <td key={c} className="px-4 py-3">
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export default function DovizPage() {
  const [currencies, setCurrencies] = useState<RateRow[]>([]);
  const [gold, setGold] = useState<GoldRow[]>([]);
  const [crypto, setCrypto] = useState<RateRow[]>([]);
  const [bist, setBist] = useState<{ value: number; change: number } | null>(null);
  const [updatedAt, setUpdatedAt] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load(silent = false) {
      if (!silent) setLoading(true);
      try {
        const res = await fetch("/api/market", { cache: "no-store" });
        if (!res.ok || !active) return;
        const data = await res.json();
        const items: { name: string; value: string; change: number }[] = data.items ?? [];

        const cur: RateRow[] = [];
        const gld: GoldRow[] = [];
        const cry: RateRow[] = [];
        let bst: { value: number; change: number } | null = null;

        for (const item of items) {
          const val = parseFloat(item.value.replace(/\./g, "").replace(",", "."));
          if (item.name in CURRENCY_NAMES) {
            cur.push({ code: item.name, name: CURRENCY_NAMES[item.name], value: val, change: item.change });
          } else if (item.name in GOLD_NAMES) {
            gld.push({ name: GOLD_NAMES[item.name], value: val, change: item.change });
          } else if (item.name === "BTC" || item.name === "ETH") {
            cry.push({ code: item.name, name: item.name === "BTC" ? "Bitcoin" : "Ethereum", value: val, change: item.change });
          } else if (item.name === "BIST") {
            bst = { value: val, change: item.change };
          }
        }

        if (!active) return;
        setCurrencies(cur);
        setGold(gld);
        setCrypto(cry);
        setBist(bst);
        if (data.updatedAt) setUpdatedAt(new Date(data.updatedAt).toLocaleString("tr-TR"));
      } finally {
        if (active && !silent) setLoading(false);
      }
    }
    load();
    // 10 dakikada bir arka planda sessizce tazele.
    const id = setInterval(() => load(true), 10 * 60 * 1000);
    // Kullanıcı sekmeye/pencereye geri döndüğünde anında güncelle.
    const onFocus = () => {
      if (document.visibilityState === "visible") load(true);
    };
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("focus", onFocus);
    return () => {
      active = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Piyasalar: Döviz, Altın & Borsa</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading ? "Güncelleniyor…" : updatedAt ? `Son güncelleme: ${updatedAt} · 10 dakikada bir yenilenir` : "Anlık veriler"}
          </p>
        </div>
        {loading && <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />}
      </div>

      {/* Öne çıkan piyasalar: BIST 100 + kripto özet */}
      {(bist || crypto.length > 0) && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {bist && (
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">BIST 100</span>
                <ChangeCell change={bist.change} />
              </div>
              <p className="mt-1 font-mono text-lg font-bold">{fmt(bist.value, 0)}</p>
              <p className="text-[11px] text-muted-foreground">Borsa İstanbul Endeksi</p>
            </div>
          )}
          {crypto.map((c) => (
            <div key={c.code} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{c.code}</span>
                <ChangeCell change={c.change} />
              </div>
              <p className="mt-1 font-mono text-lg font-bold">{fmt(c.value, 0)} ₺</p>
              <p className="text-[11px] text-muted-foreground">{c.name}</p>
            </div>
          ))}
        </div>
      )}

      {/* Döviz Kurları */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Döviz Kurları (TL)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Döviz</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">Alış</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">Satış</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">Değişim</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <SkeletonRows n={3} /> : currencies.map((r) => (
                <tr key={r.code} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold">{r.code === "STERLİN" ? "GBP" : r.code}</span>
                      <span className="text-sm text-muted-foreground">{r.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm">{fmt(r.value * 0.999, 4)}</td>
                  <td className="px-4 py-3 text-right font-mono text-sm">{fmt(r.value * 1.001, 4)}</td>
                  <td className="px-4 py-3 text-right"><ChangeCell change={r.change} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Altın Fiyatları */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Altın & Gümüş (TL)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Tür</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">Alış</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">Satış</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">Değişim</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <SkeletonRows n={2} /> : gold.map((r) => (
                <tr key={r.name} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 text-sm font-medium">{r.name}</td>
                  <td className="px-4 py-3 text-right font-mono text-sm">{fmt(r.value * 0.999)}</td>
                  <td className="px-4 py-3 text-right font-mono text-sm">{fmt(r.value * 1.001)}</td>
                  <td className="px-4 py-3 text-right"><ChangeCell change={r.change} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Kripto */}
      {(loading || crypto.length > 0) && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Kripto Para (TL)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Kripto</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">Fiyat</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">24s Değişim</th>
                </tr>
              </thead>
              <tbody>
                {loading ? <SkeletonRows n={2} /> : crypto.map((r) => (
                  <tr key={r.code} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold">{r.code}</span>
                        <span className="text-sm text-muted-foreground">{r.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm">{fmt(r.value, 0)} ₺</td>
                    <td className="px-4 py-3 text-right"><ChangeCell change={r.change} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
