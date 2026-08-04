"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, RefreshCw } from "lucide-react";

export default function AltinFiyatlariPage() {
  const [gramAltin, setGramAltin] = useState<number | null>(null);
  const [gramGumus, setGramGumus] = useState<number | null>(null);
  const [altinChange, setAltinChange] = useState<number>(0);
  const [gumusChange, setGumusChange] = useState<number>(0);
  const [updatedAt, setUpdatedAt] = useState<string>("");
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
        const altin = items.find((i) => i.name === "ALTIN");
        const gumus = items.find((i) => i.name === "GÜMÜŞ");
        if (altin) {
          setGramAltin(parseFloat(altin.value.replace(/\./g, "").replace(",", ".")));
          setAltinChange(altin.change);
        }
        if (gumus) {
          setGramGumus(parseFloat(gumus.value.replace(/\./g, "").replace(",", ".")));
          setGumusChange(gumus.change);
        }
        if (data.updatedAt) {
          setUpdatedAt(new Date(data.updatedAt).toLocaleString("tr-TR"));
        }
      } finally {
        if (active && !silent) setLoading(false);
      }
    }
    load();
    const id = setInterval(() => load(true), 10 * 60 * 1000);
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

  function fmt(v: number) {
    return v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // Türev fiyatlar gram altın üzerinden hesaplanır
  const g = gramAltin ?? 0;
  const rows = g > 0 ? [
    { name: "Gram Altın",       buying: g,          selling: g * 1.003,    change: altinChange },
    { name: "Çeyrek Altın",     buying: g * 1.6016,  selling: g * 1.6016 * 1.003, change: altinChange },
    { name: "Yarım Altın",      buying: g * 3.2032,  selling: g * 3.2032 * 1.003, change: altinChange },
    { name: "Tam Altın",        buying: g * 6.4063,  selling: g * 6.4063 * 1.003, change: altinChange },
    { name: "Cumhuriyet Altını",buying: g * 6.6700,  selling: g * 6.6700 * 1.003, change: altinChange },
    { name: "Ata Altın",        buying: g * 6.7000,  selling: g * 6.7000 * 1.003, change: altinChange },
    { name: "14 Ayar Altın",    buying: g * 0.5833,  selling: g * 0.5833 * 1.003, change: altinChange },
    { name: "22 Ayar Bilezik",  buying: g * 0.9166,  selling: g * 0.9166 * 1.003, change: altinChange },
    { name: "ONS Altın ($)",    buying: g * 31.1035, selling: g * 31.1035 * 1.003, change: altinChange },
    { name: "Gram Gümüş",       buying: gramGumus ?? 0, selling: (gramGumus ?? 0) * 1.005, change: gumusChange },
  ] : [];

  function ChangeCell({ change }: { change: number }) {
    return (
      <span className={`inline-flex items-center gap-1 font-medium ${change >= 0 ? "text-green-600" : "text-red-600"}`}>
        {change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        %{Math.abs(change).toFixed(2)}
      </span>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Altın Fiyatları</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {loading ? "Güncelleniyor…" : updatedAt ? `Son güncelleme: ${updatedAt}` : "Anlık veriler"}
          </p>
        </div>
        {loading && <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />}
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-bold">Tür</th>
              <th className="px-4 py-3 text-right font-bold">Alış (₺)</th>
              <th className="px-4 py-3 text-right font-bold">Satış (₺)</th>
              <th className="px-4 py-3 text-right font-bold">Değişim</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={i} className="border-b last:border-0">
                  {[1, 2, 3, 4].map((c) => (
                    <td key={c} className="px-4 py-3">
                      <div className="h-4 w-full animate-pulse rounded bg-muted" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.map((item) => (
              <tr key={item.name} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 font-semibold">{item.name}</td>
                <td className="px-4 py-3 text-right font-mono">{fmt(item.buying)}</td>
                <td className="px-4 py-3 text-right font-mono">{fmt(item.selling)}</td>
                <td className="px-4 py-3 text-right"><ChangeCell change={item.change} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        * Alış/satış farkı yaklaşık %0,3-0,5 katsayısıyla hesaplanmıştır. Kesin fiyat için bankanızı arayın.
      </p>
    </div>
  );
}
