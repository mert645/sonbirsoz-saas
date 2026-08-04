"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "sbs-install-dismissed";
const DISMISS_DAYS = 14;

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed && Date.now() - Number(dismissed) < DISMISS_DAYS * 86400000) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!visible || !deferred) return null;

  const install = async () => {
    setVisible(false);
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "dismissed") {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    }
    setDeferred(null);
  };

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-xl border bg-background p-4 shadow-lg md:left-auto md:right-6">
      <img src="/icons/icon-96.png" alt="" className="h-10 w-10 rounded-lg" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Son Bir Söz uygulaması</p>
        <p className="text-xs text-muted-foreground">
          Ana ekranınıza ekleyin, haberlere anında ulaşın.
        </p>
      </div>
      <button
        onClick={install}
        className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700"
      >
        <Download className="h-3.5 w-3.5" />
        Yükle
      </button>
      <button
        onClick={dismiss}
        aria-label="Kapat"
        className="rounded-md p-1 text-muted-foreground hover:bg-muted"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
