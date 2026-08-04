"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";

interface Story {
  id: string;
  title: string;
  category: string;
  categoryColor: string;
  image: string;
  spot: string;
  time: string;
}

const STORIES: Story[] = [
  { id: "s1", title: "Erdoğan'dan kritik mesajlar", category: "Gündem", categoryColor: "#ef4444", image: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=800&q=80", spot: "Kabine toplantısı sonrası yeni reform paketi açıklandı. Ekonomi ve dış politikada önemli adımlar.", time: "15 dk" },
  { id: "s2", title: "BIST100 tarihi rekor", category: "Finans", categoryColor: "#14b8a6", image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80", spot: "Borsa İstanbul'da endeks 15.000 seviyesini aştı. Yabancı yatırımcı girişi hızlandı.", time: "45 dk" },
  { id: "s3", title: "AB müzakereleri başlıyor", category: "Dünya", categoryColor: "#3b82f6", image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&q=80", spot: "Avrupa Birliği ile Türkiye arasında yeni dönem. Vize serbestisi masada.", time: "1 saat" },
  { id: "s4", title: "Yerli yapay zeka modeli", category: "Teknoloji", categoryColor: "#06b6d4", image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80", spot: "TÜBİTAK'ın geliştirdiği Türkçe LLM modeli uluslararası arenada dikkat çekiyor.", time: "2 saat" },
  { id: "s5", title: "Şampiyonluk yarışı", category: "Spor", categoryColor: "#f59e0b", image: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80", spot: "Süper Lig'de son 3 haftaya girildi. Üç takım arasında kıyasıya mücadele sürüyor.", time: "3 saat" },
  { id: "s6", title: "Faiz kararı açıklandı", category: "Ekonomi", categoryColor: "#10b981", image: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800&q=80", spot: "Merkez Bankası politika faizini sabit tuttu. Piyasalarda ilk tepkiler olumlu.", time: "4 saat" },
  { id: "s7", title: "Apple'dan yeni cihaz", category: "Teknoloji", categoryColor: "#06b6d4", image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80", spot: "Vision Pro 2 tanıtıldı. Fiyatı ve Türkiye satış tarihi belli oldu.", time: "5 saat" },
  { id: "s8", title: "İstanbul'da yeni metro", category: "Gündem", categoryColor: "#ef4444", image: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=800&q=80", spot: "Başakşehir-Kayaşehir metro hattı hizmete açıldı. 700 bin kişiye ulaşım kolaylığı.", time: "6 saat" },
];

const STORY_DURATION = 5000;

export function NewsStories() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const isOpen = activeIndex !== null;

  const close = useCallback(() => {
    setActiveIndex(null);
    setProgress(0);
    setIsPaused(false);
  }, []);

  const next = useCallback(() => {
    if (activeIndex === null) return;
    if (activeIndex < STORIES.length - 1) {
      setActiveIndex(activeIndex + 1);
      setProgress(0);
    } else {
      close();
    }
  }, [activeIndex, close]);

  const prev = useCallback(() => {
    if (activeIndex === null) return;
    if (activeIndex > 0) {
      setActiveIndex(activeIndex - 1);
      setProgress(0);
    }
  }, [activeIndex]);

  useEffect(() => {
    if (!isOpen || isPaused) return;
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          next();
          return 0;
        }
        return p + (100 / (STORY_DURATION / 50));
      });
    }, 50);
    return () => clearInterval(interval);
  }, [isOpen, isPaused, next]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
      if (e.key === " ") { e.preventDefault(); setIsPaused((p) => !p); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, close, next, prev]);

  return (
    <>
      {/* Story Bubbles */}
      <div className="flex gap-4 overflow-x-auto px-4 py-4 scrollbar-hide md:gap-5">
        {STORIES.map((story, i) => (
          <button
            key={story.id}
            onClick={() => { setActiveIndex(i); setProgress(0); }}
            className="group flex shrink-0 flex-col items-center gap-1.5"
          >
            <div className="relative h-16 w-16 md:h-[72px] md:w-[72px]">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-[2.5px]">
                <div className="h-full w-full rounded-full bg-background p-[2px]">
                  <div className="relative h-full w-full overflow-hidden rounded-full">
                    <Image src={story.image} alt={story.title} fill className="object-cover transition-transform duration-200 group-hover:scale-110" sizes="72px" />
                  </div>
                </div>
              </div>
            </div>
            <span className="max-w-[72px] truncate text-[10px] font-medium text-muted-foreground group-hover:text-foreground">
              {story.category}
            </span>
          </button>
        ))}
      </div>

      {/* Story Viewer Modal */}
      {isOpen && activeIndex !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm">
          {/* Close */}
          <button onClick={close} className="absolute right-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20">
            <X className="h-5 w-5" />
          </button>

          {/* Navigation Arrows */}
          {activeIndex > 0 && (
            <button onClick={prev} className="absolute left-2 top-1/2 z-50 hidden -translate-y-1/2 items-center justify-center rounded-full bg-white/10 p-2 text-white backdrop-blur transition-colors hover:bg-white/20 md:flex">
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}
          {activeIndex < STORIES.length - 1 && (
            <button onClick={next} className="absolute right-2 top-1/2 z-50 hidden -translate-y-1/2 items-center justify-center rounded-full bg-white/10 p-2 text-white backdrop-blur transition-colors hover:bg-white/20 md:flex">
              <ChevronRight className="h-6 w-6" />
            </button>
          )}

          {/* Story Card */}
          <div className="relative h-[85vh] w-full max-w-[420px] overflow-hidden rounded-2xl md:h-[90vh]">
            {/* Background Image */}
            <Image
              src={STORIES[activeIndex].image}
              alt={STORIES[activeIndex].title}
              fill
              className="object-cover"
              sizes="420px"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80" />

            {/* Progress Bars */}
            <div className="absolute left-0 right-0 top-0 z-10 flex gap-1 px-3 pt-3">
              {STORIES.map((_, i) => (
                <div key={i} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/25">
                  <div
                    className="h-full rounded-full bg-white transition-all duration-75 ease-linear"
                    style={{
                      width: i < activeIndex ? "100%" : i === activeIndex ? `${progress}%` : "0%",
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Header */}
            <div className="absolute left-0 right-0 top-0 z-10 flex items-center gap-3 px-4 pt-7">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600">
                  <span className="text-xs font-bold text-white">S</span>
                </div>
                <div>
                  <span className="text-[12px] font-semibold text-white">Son Bir Söz</span>
                  <span className="ml-2 text-[11px] text-white/60">{STORIES[activeIndex].time} önce</span>
                </div>
              </div>
              <button onClick={() => setIsPaused(!isPaused)} className="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white">
                {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
              </button>
            </div>

            {/* Touch Areas */}
            <div className="absolute inset-0 z-[5] flex">
              <div className="w-1/3" onClick={prev} />
              <div className="w-1/3" onClick={() => setIsPaused(!isPaused)} />
              <div className="w-1/3" onClick={next} />
            </div>

            {/* Content */}
            <div className="absolute bottom-0 left-0 right-0 z-10 p-5">
              <span className="inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white" style={{ backgroundColor: STORIES[activeIndex].categoryColor }}>
                {STORIES[activeIndex].category}
              </span>
              <h2 className="mt-2 text-xl font-extrabold leading-tight text-white md:text-2xl">
                {STORIES[activeIndex].title}
              </h2>
              <p className="mt-2 text-[14px] leading-relaxed text-white/80">
                {STORIES[activeIndex].spot}
              </p>
              <button className="mt-4 rounded-full bg-white/20 px-4 py-2 text-[12px] font-semibold text-white backdrop-blur transition-colors hover:bg-white/30">
                Haberi Oku →
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
