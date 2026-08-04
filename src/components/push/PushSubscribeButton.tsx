"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";

export default function PushSubscribeButton() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    fetch("/api/push/vapid-public-key")
      .then((r) => r.json())
      .then((data) => {
        if (data.enabled && data.publicKey) {
          setPublicKey(data.publicKey);
          setSupported(true);
        }
      })
      .catch(() => {});

    navigator.serviceWorker.ready.then(async (reg) => {
      const existing = await reg.pushManager.getSubscription();
      setSubscribed(!!existing);
    });
  }, []);

  if (!supported) return null;

  async function toggle() {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();

      if (existing) {
        await existing.unsubscribe();
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: existing.endpoint }),
        });
        setSubscribed(false);
      } else {
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: publicKey!,
        });
        const json = sub.toJSON() as {
          endpoint: string;
          keys: { auth: string; p256dh: string };
        };
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: json.endpoint,
            keys: json.keys,
          }),
        });
        setSubscribed(true);
      }
    } catch {
      // Permission denied or error — ignore silently
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      aria-label={subscribed ? "Bildirimleri kapat" : "Haber bildirimlerine abone ol"}
      title={subscribed ? "Bildirimleri kapat" : "Haber bildirimlerine abone ol"}
      className="flex items-center justify-center rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
    >
      {subscribed ? (
        <BellOff className="h-5 w-5" />
      ) : (
        <Bell className="h-5 w-5" />
      )}
    </button>
  );
}
