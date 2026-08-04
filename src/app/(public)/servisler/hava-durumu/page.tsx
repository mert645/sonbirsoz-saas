"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

const CITIES = [
  { name: "İstanbul",  lat: 41.0082, lon: 28.9784 },
  { name: "Ankara",    lat: 39.9334, lon: 32.8597 },
  { name: "İzmir",     lat: 38.4192, lon: 27.1287 },
  { name: "Antalya",   lat: 36.8969, lon: 30.7133 },
  { name: "Bursa",     lat: 40.1885, lon: 29.0610 },
  { name: "Adana",     lat: 37.0000, lon: 35.3213 },
  { name: "Trabzon",   lat: 41.0015, lon: 39.7178 },
  { name: "Gaziantep", lat: 37.0662, lon: 37.3833 },
];

const WMO: Record<number, string> = {
  0: "Açık", 1: "Çoğunlukla Açık", 2: "Parçalı Bulutlu", 3: "Bulutlu",
  45: "Sisli", 48: "Kırağılı Sis",
  51: "Hafif Çisenti", 53: "Çisenti", 55: "Yoğun Çisenti",
  61: "Hafif Yağmur", 63: "Yağmur", 65: "Yoğun Yağmur",
  71: "Hafif Kar", 73: "Kar", 75: "Yoğun Kar",
  80: "Hafif Sağanak", 81: "Sağanak", 82: "Yoğun Sağanak",
  95: "Fırtınalı", 96: "Dolulu Fırtına",
};

const WMO_EMOJI: Record<number, string> = {
  0: "☀️", 1: "🌤️", 2: "⛅", 3: "☁️",
  45: "🌫️", 48: "🌫️",
  51: "🌦️", 53: "🌦️", 55: "🌧️",
  61: "🌧️", 63: "🌧️", 65: "🌧️",
  71: "🌨️", 73: "❄️", 75: "❄️",
  80: "🌦️", 81: "🌧️", 82: "⛈️",
  95: "⛈️", 96: "⛈️",
};

interface DayForecast {
  date: string;
  label: string;
  maxTemp: number;
  minTemp: number;
  wmo: number;
}

interface CityWeather {
  name: string;
  days: DayForecast[];
}

function dayLabel(dateStr: string, idx: number) {
  if (idx === 0) return "Bugün";
  const d = new Date(dateStr);
  return d.toLocaleDateString("tr-TR", { weekday: "short" });
}

export default function HavaDurumuPage() {
  const [data, setData] = useState<CityWeather[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const results = await Promise.allSettled(
          CITIES.map(async (city) => {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=Europe%2FIstanbul&forecast_days=5`;
            const res = await fetch(url, { next: { revalidate: 3600 } });
            if (!res.ok) throw new Error("fetch failed");
            const json = await res.json();
            const days: DayForecast[] = json.daily.time.map((date: string, i: number) => ({
              date,
              label: dayLabel(date, i),
              maxTemp: Math.round(json.daily.temperature_2m_max[i]),
              minTemp: Math.round(json.daily.temperature_2m_min[i]),
              wmo: json.daily.weathercode[i],
            }));
            return { name: city.name, days };
          })
        );
        const ok = results
          .filter((r): r is PromiseFulfilledResult<CityWeather> => r.status === "fulfilled")
          .map((r) => r.value);
        setData(ok);
        setUpdatedAt(new Date().toLocaleString("tr-TR"));
      } finally {
        setLoading(false);
      }
    }
    load();
    const id = setInterval(load, 60 * 60 * 1000); // saatte bir
    return () => clearInterval(id);
  }, []);

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hava Durumu</h1>
          <p className="mt-1 text-[14px] text-muted-foreground">
            {loading ? "Güncelleniyor…" : `5 günlük tahmin — Son güncelleme: ${updatedAt}`}
          </p>
        </div>
        {loading && <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />}
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[700px] text-[13px]">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-bold">Şehir</th>
              {loading
                ? [0,1,2,3,4].map((i) => <th key={i} className="px-4 py-3 text-center font-bold">—</th>)
                : (data[0]?.days ?? []).map((d) => (
                    <th key={d.date} className="px-4 py-3 text-center font-bold">{d.label}</th>
                  ))
              }
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b last:border-0">
                    {[0,1,2,3,4,5].map((c) => (
                      <td key={c} className="px-4 py-3">
                        <div className="h-10 w-full animate-pulse rounded bg-muted" />
                      </td>
                    ))}
                  </tr>
                ))
              : data.map((city) => (
                  <tr key={city.name} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-semibold">{city.name}</td>
                    {city.days.map((d) => (
                      <td key={d.date} className="px-4 py-3 text-center">
                        <div className="text-xl">{WMO_EMOJI[d.wmo] ?? "🌡️"}</div>
                        <div className="mt-0.5 font-bold">{d.maxTemp}°</div>
                        <div className="text-[11px] text-muted-foreground">{d.minTemp}°</div>
                        <div className="mt-0.5 text-[10px] text-muted-foreground">{WMO[d.wmo] ?? "—"}</div>
                      </td>
                    ))}
                  </tr>
                ))
            }
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">Kaynak: Open-Meteo (açık kaynak meteoroloji API)</p>
    </div>
  );
}
