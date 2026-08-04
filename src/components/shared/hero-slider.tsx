"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Clock, ChevronLeft, ChevronRight } from "lucide-react";

interface HeroSlide {
  title: string;
  slug: string;
  spot: string;
  image: string;
  category: string;
  time: string;
}

export type { HeroSlide };

const HERO_SLIDES: HeroSlide[] = [
  {
    title: "Seçil Erzan, 11 Eylül'de hakim karşısına çıkacak",
    slug: "gundem/secil-erzan-11-eylulde-hakim-karsisina-cikacak",
    spot: "Zimmetine para geçirmekle suçlanan eski bankacı Seçil Erzan'ın yargılanmasına devam edilecek.",
    image: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&q=80",
    category: "Gündem",
    time: "15 dk önce",
  },
  {
    title: "Merkez Bankası faiz oranını yüzde 37'de sabit tuttu",
    slug: "ekonomi/merkez-bankasi-faiz-sabit",
    spot: "TCMB aylık para politikası toplantısında politika faizini değiştirmedi.",
    image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&q=80",
    category: "Ekonomi",
    time: "2 saat önce",
  },
  {
    title: "İran'dan İsrail'e balistik füze saldırısı: Bölgede alarm",
    slug: "dunya/iran-israil-fuze-saldirisi",
    spot: "Ortadoğu'da gerilim tırmanıyor. ABD'den diplomasi çağrısı geldi.",
    image: "https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=1200&q=80",
    category: "Dünya",
    time: "3 saat önce",
  },
  {
    title: "Fenerbahçe'nin yeni başkanı Aziz Yıldırım mazbatasını aldı",
    slug: "spor/fenerbahce-aziz-yildirim",
    spot: "12 yıl aradan sonra yeniden koltuğa oturan Yıldırım, hedeflerini açıkladı.",
    image: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1200&q=80",
    category: "Spor",
    time: "1 saat önce",
  },
  {
    title: "Apple Vision Pro Türkiye satış tarihi ve fiyatı açıklandı",
    slug: "teknoloji/apple-vision-pro-turkiye",
    spot: "Apple'ın karma gerçeklik gözlüğü Türkiye pazarına giriyor.",
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&q=80",
    category: "Teknoloji",
    time: "4 saat önce",
  },
];

export function HeroSlider({ slides }: { slides?: HeroSlide[] }) {
  const data = slides && slides.length > 0 ? slides : HERO_SLIDES;
  const [current, setCurrent] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % data.length);
  }, [data.length]);

  const prev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + data.length) % data.length);
  }, [data.length]);

  useEffect(() => {
    if (!isAutoPlaying) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [isAutoPlaying, next]);

  const slide = data[current];

  return (
    <div
      className="group relative"
      onMouseEnter={() => setIsAutoPlaying(false)}
      onMouseLeave={() => setIsAutoPlaying(true)}
    >
      <Link href={`/${slide.slug}`} className="relative block aspect-[2/1] overflow-hidden rounded-lg lg:aspect-[2.1/1]">
        {data.map((s, i) => (
          <Image
            key={s.slug}
            src={s.image}
            alt={s.title}
            fill
            className={`object-cover transition-opacity duration-700 ${i === current ? "opacity-100" : "opacity-0"}`}
            sizes="(max-width: 1024px) 100vw, 800px"
            priority={i === 0}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5 md:p-7">
          <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-white/80">
            {slide.category}
          </span>
          <h1 className="mt-1.5 max-w-[600px] text-[20px] font-bold leading-tight text-white md:text-[26px] lg:text-[28px]">
            {slide.title}
          </h1>
          <p className="mt-2 hidden max-w-[500px] text-[13px] leading-relaxed text-white/70 md:block">
            {slide.spot}
          </p>
          <span className="mt-2.5 flex items-center gap-1.5 text-[11px] text-white/50">
            <Clock className="h-3 w-3" />
            {slide.time}
          </span>
        </div>
      </Link>

      {/* Navigation */}
      <button
        onClick={(e) => { e.preventDefault(); prev(); }}
        className="absolute left-3 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 hover:bg-white/30"
        aria-label="Önceki"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        onClick={(e) => { e.preventDefault(); next(); }}
        className="absolute right-3 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 hover:bg-white/30"
        aria-label="Sonraki"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      {/* Indicators */}
      <div className="absolute bottom-3 right-5 z-10 flex gap-1">
        {data.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-[3px] rounded-full transition-all ${
              i === current ? "w-5 bg-white" : "w-2 bg-white/40 hover:bg-white/60"
            }`}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
