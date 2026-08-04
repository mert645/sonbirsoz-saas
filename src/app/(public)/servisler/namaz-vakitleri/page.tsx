"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

// Aladhan city IDs (Turkey)
const CITIES = [
  { name: "İstanbul",  id: "745044" },
  { name: "Ankara",    id: "323786" },
  { name: "İzmir",     id: "311046" },
  { name: "Antalya",   id: "298170" },
  { name: "Bursa",     id: "750269" },
  { name: "Konya",     id: "300772" },
  { name: "Adana",     id: "323777" },
  { name: "Gaziantep", id: "314830" },
];

interface PrayerTimes {
  city: string;
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
}

function short(t: string) {
  // "04:12 (EET)" → "04:12"
  return t.split(" ")[0].slice(0, 5);
}

export default function NamazVakitleriPage() {
  const [times, setTimes] = useState<PrayerTimes[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateLabel, setDateLabel] = useState("");

  useEffect(() => {
    const today = new Date();
    const d = String(today.getDate()).padStart(2, "0");
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const y = today.getFullYear();
    setDateLabel(today.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }));

    async function load() {
      setLoading(true);
      try {
        const results = await Promise.allSettled(
          CITIES.map(async (city) => {
            const res = await fetch(
              `https://api.aladhan.com/v1/timingsByCity/${d}-${m}-${y}?city=${encodeURIComponent(city.name)}&country=Turkey&method=13`,
              { next: { revalidate: 3600 * 12 } }
            );
            if (!res.ok) throw new Error("fetch failed");
            const json = await res.json();
            const t = json.data?.timings;
            return {
              city: city.name,
              Fajr:    short(t.Fajr),
              Sunrise: short(t.Sunrise),
              Dhuhr:   short(t.Dhuhr),
              Asr:     short(t.Asr),
              Maghrib: short(t.Maghrib),
              Isha:    short(t.Isha),
            } as PrayerTimes;
          })
        );
        const ok = results
          .filter((r): r is PromiseFulfilledResult<PrayerTimes> => r.status === "fulfilled")
          .map((r) => r.value);
        setTimes(ok);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Aktif vakti bul
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  function toMin(t: string) {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  }
  function isActive(col: keyof Omit<PrayerTimes, "city">, row: PrayerTimes) {
    const cols: (keyof Omit<PrayerTimes, "city">)[] = ["Fajr","Sunrise","Dhuhr","Asr","Maghrib","Isha"];
    const idx = cols.indexOf(col);
    const start = toMin(row[col]);
    const end = idx < cols.length - 1 ? toMin(row[cols[idx + 1]]) : 1440;
    return nowMin >= start && nowMin < end;
  }

  const cols: { key: keyof Omit<PrayerTimes, "city">; label: string }[] = [
    { key: "Fajr",    label: "İmsak" },
    { key: "Sunrise", label: "Güneş" },
    { key: "Dhuhr",   label: "Öğle" },
    { key: "Asr",     label: "İkindi" },
    { key: "Maghrib", label: "Akşam" },
    { key: "Isha",    label: "Yatsı" },
  ];

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Namaz Vakitleri</h1>
          <p className="mt-1 text-[14px] text-muted-foreground">{dateLabel}</p>
        </div>
        {loading && <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />}
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[600px] text-[13px]">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-bold">Şehir</th>
              {cols.map((c) => (
                <th key={c.key} className="px-4 py-3 text-center font-bold">{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b last:border-0">
                    {[0,1,2,3,4,5,6].map((c) => (
                      <td key={c} className="px-4 py-3">
                        <div className="h-4 w-full animate-pulse rounded bg-muted" />
                      </td>
                    ))}
                  </tr>
                ))
              : times.map((row) => (
                  <tr key={row.city} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-semibold">{row.city}</td>
                    {cols.map((c) => {
                      const active = isActive(c.key, row);
                      return (
                        <td key={c.key} className={`px-4 py-3 text-center ${active ? "font-bold text-primary" : "text-muted-foreground"}`}>
                          {row[c.key]}
                          {active && <span className="ml-1 text-[9px] rounded bg-primary/10 px-1 py-0.5 text-primary">Şimdi</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))
            }
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">Kaynak: Aladhan API — Diyanet İşleri Başkanlığı metoduyla hesaplanmaktadır.</p>
    </div>
  );
}
