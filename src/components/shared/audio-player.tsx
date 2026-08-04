"use client";

import { useEffect, useRef, useState } from "react";
import { Headphones, Pause, Play } from "lucide-react";

interface AudioPlayerProps {
  src: string;
  title?: string;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** "Bu haberi dinle" — makale sayfası sesli özet oynatıcısı. */
export function AudioPlayer({ src, title }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime = () => setCurrent(audio.currentTime);
    const onMeta = () => setDuration(audio.duration);
    const onEnd = () => {
      setPlaying(false);
      setCurrent(0);
    };
    const onError = () => setFailed(true);

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnd);
    audio.addEventListener("error", onError);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnd);
      audio.removeEventListener("error", onError);
    };
  }, []);

  if (failed) return null;

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().then(() => setPlaying(true)).catch(() => setFailed(true));
    }
  };

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const t = (Number(e.target.value) / 100) * duration;
    audio.currentTime = t;
    setCurrent(t);
  };

  const progress = duration > 0 ? (current / duration) * 100 : 0;

  return (
    <div className="my-4 flex items-center gap-3 rounded-lg border bg-muted/40 px-4 py-3">
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        onClick={toggle}
        aria-label={playing ? "Duraklat" : "Bu haberi dinle"}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105"
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
      </button>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <Headphones className="h-3.5 w-3.5 text-primary" />
          Bu haberi dinle
          {title && <span className="sr-only"> — {title}</span>}
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={100}
            step={0.5}
            value={progress}
            onChange={seek}
            aria-label="Ses konumu"
            className="h-1 w-full cursor-pointer appearance-none rounded-full bg-border accent-primary"
          />
          <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
            {formatTime(current)} / {formatTime(duration)}
          </span>
        </div>
      </div>
    </div>
  );
}
