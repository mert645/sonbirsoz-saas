"use client";

import { useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(json.error || "Bir hata oluştu.");
        return;
      }
      setStatus("success");
      setMessage(json.message || "Abone oldunuz!");
      trackEvent("newsletter_signup", { method: "footer_form" });
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("Bağlantı hatası. Lütfen tekrar deneyin.");
    }
  }

  if (status === "success") {
    return (
      <div className="flex w-full max-w-sm items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-[13px] font-medium text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        {message}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-2">
      <div className="flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-posta adresiniz"
          className="flex-1 rounded-md border bg-background px-4 py-2.5 text-[13px] placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="flex shrink-0 items-center gap-1.5 rounded-md bg-primary px-5 py-2.5 text-[13px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {status === "loading" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Abone Ol
        </button>
      </div>
      {status === "error" && (
        <p className="text-[12px] text-red-500">{message}</p>
      )}
    </form>
  );
}
