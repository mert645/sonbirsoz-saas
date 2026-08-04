"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export function RegistrationWall() {
  const [dismissed, setDismissed] = useState(false);
  const [email, setEmail] = useState("");

  if (dismissed) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
        <button
          onClick={() => setDismissed(true)}
          className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-muted"
          aria-label="Kapat"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="text-center">
          <h2 className="text-xl font-bold">Okumaya Devam Edin</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Tüm haberlere sınırsız erişim için ücretsiz kaydolun.
            Kredi kartı gerektirmez.
          </p>
        </div>

        <form className="mt-6 space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-posta adresiniz"
            className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <Button className="w-full" type="submit">
            Ücretsiz Kaydol
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Kaydolarak{" "}
          <Link href="/kvkk" className="underline">
            KVKK Aydınlatma Metni
          </Link>
          &apos;ni kabul etmiş olursunuz.
        </p>

        <button
          onClick={() => setDismissed(true)}
          className="mt-3 w-full text-center text-xs text-muted-foreground hover:text-foreground"
        >
          Şimdilik geç
        </button>
      </div>
    </div>
  );
}
