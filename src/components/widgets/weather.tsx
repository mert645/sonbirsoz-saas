"use client";

import { useState } from "react";
import { Cloud, CloudRain, CloudSun, Sun, Wind } from "lucide-react";
import { cn } from "@/lib/utils";

const CITIES = [
  { city: "İstanbul", temp: 28, high: 30, low: 22, condition: "sunny", humidity: 45, wind: 12 },
  { city: "Ankara", temp: 32, high: 35, low: 24, condition: "partly-cloudy", humidity: 30, wind: 8 },
  { city: "İzmir", temp: 34, high: 36, low: 26, condition: "sunny", humidity: 40, wind: 15 },
  { city: "Antalya", temp: 36, high: 38, low: 27, condition: "sunny", humidity: 55, wind: 10 },
];

const FORECAST = [
  { day: "Salı", condition: "sunny", high: 31, low: 23 },
  { day: "Çarş.", condition: "partly-cloudy", high: 29, low: 21 },
  { day: "Perş.", condition: "rainy", high: 25, low: 18 },
];

function CondIcon({ condition, className }: { condition: string; className?: string }) {
  const cls = cn("h-5 w-5", className);
  if (condition === "sunny") return <Sun className={cls} />;
  if (condition === "rainy") return <CloudRain className={cls} />;
  if (condition === "partly-cloudy") return <CloudSun className={cls} />;
  return <Cloud className={cls} />;
}

export function WeatherWidget() {
  const [active, setActive] = useState(0);
  const city = CITIES[active];

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <h3 className="text-[13px] font-bold uppercase tracking-wide">Hava Durumu</h3>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* City tabs */}
      <div className="mb-3 flex gap-1">
        {CITIES.map((c, i) => (
          <button
            key={c.city}
            onClick={() => setActive(i)}
            className={cn(
              "rounded px-2.5 py-1 text-[11px] font-medium transition-colors",
              active === i ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {c.city}
          </button>
        ))}
      </div>

      {/* Current */}
      <div className="flex items-center justify-between rounded-md bg-muted/60 px-4 py-3 dark:bg-muted">
        <div className="flex items-baseline gap-1">
          <span className="text-[32px] font-bold leading-none text-foreground">{city.temp}°</span>
          <span className="text-[12px] text-muted-foreground">{city.high}° / {city.low}°</span>
        </div>
        <div className="flex flex-col items-end gap-1">
          <CondIcon condition={city.condition} className="text-foreground" />
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Wind className="h-3 w-3" />{city.wind} km/s
          </span>
        </div>
      </div>

      {/* Forecast */}
      <div className="mt-2 grid grid-cols-3 gap-2">
        {FORECAST.map((f) => (
          <div key={f.day} className="flex flex-col items-center gap-0.5 rounded-md py-2 text-center">
            <span className="text-[10px] font-medium text-muted-foreground">{f.day}</span>
            <CondIcon condition={f.condition} className="h-4 w-4 text-muted-foreground" />
            <span className="text-[11px] font-semibold">{f.high}°</span>
            <span className="text-[10px] text-muted-foreground">{f.low}°</span>
          </div>
        ))}
      </div>
    </div>
  );
}
