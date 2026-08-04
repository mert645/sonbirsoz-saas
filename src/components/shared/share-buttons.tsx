"use client";

import { Share2, Link2, MessageCircle, Send } from "lucide-react";
import { useState } from "react";
import { userShareUrl } from "@/lib/utils/utm";

/** Lucide'ın yeni sürümlerinde marka ikonları yok; Facebook için inline SVG. */
function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

interface ShareButtonsProps {
  url: string;
  title: string;
  articleId?: string;
}

/** GA4 paylaşım eventi + shareCount artışı (best-effort). */
function trackShare(channel: string, articleId?: string) {
  try {
    const w = window as unknown as { gtag?: (...args: unknown[]) => void };
    w.gtag?.("event", "share", { method: channel, content_type: "article", item_id: articleId });
  } catch {
    /* analytics yoksa sessiz geç */
  }
  if (articleId) {
    fetch("/api/articles/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ articleId, channel }),
      keepalive: true,
    }).catch(() => {});
  }
}

export function ShareButtons({ url, title, articleId }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const shareLinks = [
    {
      name: "X",
      icon: Send,
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(userShareUrl(url, "twitter"))}`,
    },
    {
      name: "Facebook",
      icon: FacebookIcon,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(userShareUrl(url, "facebook"))}`,
    },
    {
      name: "WhatsApp",
      icon: MessageCircle,
      href: `https://wa.me/?text=${encodeURIComponent(title + " " + userShareUrl(url, "whatsapp"))}`,
    },
    {
      name: "Telegram",
      icon: Send,
      href: `https://t.me/share/url?url=${encodeURIComponent(userShareUrl(url, "telegram"))}&text=${encodeURIComponent(title)}`,
    },
  ];

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url: userShareUrl(url, "native") });
        trackShare("native", articleId);
      } catch {
        /* kullanıcı iptal etti */
      }
    } else {
      copyLink();
    }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(userShareUrl(url, "copy-link"));
    setCopied(true);
    trackShare("copy-link", articleId);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={nativeShare}
        className="flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
        aria-label="Paylaş"
      >
        <Share2 className="h-4 w-4" />
        Paylaş
      </button>
      {shareLinks.map((link) => (
        <a
          key={link.name}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackShare(link.name.toLowerCase(), articleId)}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
          aria-label={`${link.name} ile paylaş`}
        >
          <link.icon className="h-4 w-4" />
        </a>
      ))}
      <button
        onClick={copyLink}
        className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
        aria-label="Linki kopyala"
      >
        <Link2 className="h-4 w-4" />
      </button>
      {copied && (
        <span className="text-xs text-emerald-500">Kopyalandı!</span>
      )}
    </div>
  );
}
