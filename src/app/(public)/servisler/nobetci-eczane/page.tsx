"use client";

import { useEffect, useState } from "react";
import { Phone, MapPin, ExternalLink } from "lucide-react";

const CITIES = ["İstanbul", "Ankara", "İzmir", "Antalya", "Bursa", "Adana", "Kayseri", "Konya"];

interface Pharmacy {
  name: string;
  address: string;
  phone: string;
  district: string;
}

export default function NobetciEczanePage() {
  const [selectedCity, setSelectedCity] = useState("İstanbul");
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const today = new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(false);
      try {
        // collectapi.com ücretsiz tier – API key Amplify'da COLLECTAPI_KEY olarak tanımlanmalı
        const res = await fetch(`/api/nobetci-eczane?city=${encodeURIComponent(selectedCity)}`);
        if (!res.ok) throw new Error("api error");
        const data = await res.json();
        setPharmacies(data.pharmacies ?? []);
      } catch {
        setError(true);
        setPharmacies([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [selectedCity]);

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-8">
      <h1 className="text-2xl font-bold">Nöbetçi Eczane</h1>
      <p className="mt-1 text-[14px] text-muted-foreground">
        {today} tarihinde açık olan nöbetçi eczaneler
      </p>

      {/* Şehir seçimi */}
      <div className="mt-6 flex flex-wrap gap-2">
        {CITIES.map((city) => (
          <button
            key={city}
            onClick={() => setSelectedCity(city)}
            className={`rounded-full px-4 py-2 text-[13px] font-medium transition-colors ${
              selectedCity === city
                ? "bg-primary text-white"
                : "border border-border text-foreground hover:bg-muted"
            }`}
          >
            {city}
          </button>
        ))}
      </div>

      {/* İçerik */}
      <div className="mt-6">
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : error ? (
          // API key yoksa kullanıcıyı harici siteye yönlendir
          <div className="rounded-xl border border-border bg-muted/30 p-8 text-center">
            <p className="text-[15px] font-semibold text-foreground">Nöbetçi eczane verisi şu an alınamıyor.</p>
            <p className="mt-2 text-[13px] text-muted-foreground">
              Güncel nöbetçi eczane listesi için aşağıdaki linkleri kullanabilirsiniz:
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <a
                href={`https://www.eczaneler.gen.tr/nobetci/${selectedCity.toLowerCase()}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-primary/90"
              >
                <ExternalLink className="h-4 w-4" />
                eczaneler.gen.tr — {selectedCity}
              </a>
              <a
                href="https://www.eczaneler.gen.tr"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-[13px] font-medium hover:bg-muted"
              >
                Tüm Şehirler
              </a>
            </div>
          </div>
        ) : pharmacies.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">Bu şehirde bugün nöbetçi eczane bulunamadı.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {pharmacies.map((p, i) => (
              <div key={i} className="rounded-lg border border-border p-4 transition-colors hover:bg-muted/30">
                <div className="flex items-start justify-between">
                  <h3 className="text-[14px] font-bold text-foreground">{p.name}</h3>
                  <span className="shrink-0 rounded bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    AÇIK
                  </span>
                </div>
                <div className="mt-2 flex items-start gap-1 text-[12px] text-muted-foreground">
                  <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                  <span>{p.address}</span>
                </div>
                <div className="mt-2 flex items-center gap-1">
                  <Phone className="h-3 w-3 text-muted-foreground" />
                  <a href={`tel:${p.phone}`} className="text-[12px] font-medium text-primary hover:underline">
                    {p.phone}
                  </a>
                  {p.district && <span className="ml-2 text-[11px] text-muted-foreground">· {p.district}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
