"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Building2, AlertCircle, CheckCircle, Loader2 } from "lucide-react";

interface InvitationData {
  id: string;
  email: string;
  role: string;
  tenant: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
  };
}

export default function AcceptInvitePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState("");
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [userExists, setUserExists] = useState(false);
  const [form, setForm] = useState({
    name: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (!token) {
      setError("Geçersiz davet linki");
      setLoading(false);
      return;
    }

    fetch(`/api/invite/accept?token=${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setInvitation(data.invitation);
          setUserExists(data.userExists);
        }
      })
      .catch(() => setError("Davet kontrol edilemedi"))
      .finally(() => setLoading(false));
  }, [token]);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userExists && form.password !== form.confirmPassword) {
      setError("Şifreler eşleşmiyor");
      return;
    }

    setAccepting(true);
    setError("");

    try {
      const res = await fetch("/api/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          name: form.name || undefined,
          password: !userExists ? form.password : undefined,
        }),
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        if (!userExists) {
          await signIn("credentials", {
            email: invitation?.email,
            password: form.password,
            redirect: false,
          });
        }
        router.push(data.redirectUrl || "/admin/dashboard");
      }
    } catch {
      setError("Bir hata oluştu");
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 mb-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-xl font-bold mb-2">Davet Geçersiz</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!invitation) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div
            className="inline-flex h-16 w-16 items-center justify-center rounded-2xl mb-4"
            style={{ backgroundColor: "hsl(var(--primary) / 0.1)" }}
          >
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">{invitation.tenant.name}</h1>
          <p className="text-muted-foreground mt-1">
            {invitation.role === "ADMIN"
              ? "Yönetici"
              : invitation.role === "EDITOR"
              ? "Editör"
              : "Yazar"}{" "}
            olarak davet edildiniz
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <form onSubmit={handleAccept} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">E-posta</label>
              <input
                type="email"
                value={invitation.email}
                disabled
                className="w-full rounded-lg border bg-muted px-4 py-2 text-muted-foreground"
              />
            </div>

            {!userExists && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Adınız
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Adınız Soyadınız"
                    className="w-full rounded-lg border bg-background px-4 py-2 focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Şifre
                  </label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                    placeholder="En az 6 karakter"
                    className="w-full rounded-lg border bg-background px-4 py-2 focus:border-primary focus:outline-none"
                    required
                    minLength={6}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Şifre Tekrar
                  </label>
                  <input
                    type="password"
                    value={form.confirmPassword}
                    onChange={(e) =>
                      setForm({ ...form, confirmPassword: e.target.value })
                    }
                    placeholder="Şifrenizi tekrar girin"
                    className="w-full rounded-lg border bg-background px-4 py-2 focus:border-primary focus:outline-none"
                    required
                    minLength={6}
                  />
                </div>
              </>
            )}

            {userExists && (
              <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-3 text-sm text-primary">
                <CheckCircle className="h-4 w-4" />
                Hesabınız zaten mevcut. Daveti kabul etmek için tıklayın.
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={accepting}
              className="w-full rounded-lg bg-primary py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {accepting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  İşleniyor...
                </span>
              ) : (
                "Daveti Kabul Et"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
