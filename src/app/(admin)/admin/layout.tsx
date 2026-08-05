"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, SessionProvider } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  FileText,
  Image as ImageIcon,
  Tags,
  Users,
  Settings,
  Zap,
  BarChart3,
  LogOut,
  Inbox,
  Share2,
  MessageSquare,
  ShieldAlert,
  Mail,
  Clapperboard,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  plan: "STARTER" | "PROFESSIONAL" | "ENTERPRISE";
}

const ADMIN_NAV = [
  { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Onay Kuyruğu", href: "/admin/kuyruk", icon: Inbox },
  { name: "AI Moderasyon", href: "/admin/moderasyon", icon: ShieldAlert },
  { name: "Haberler", href: "/admin/haberler", icon: FileText },
  { name: "Medya", href: "/admin/medya", icon: ImageIcon },
  { name: "Video Stüdyosu", href: "/admin/video", icon: Clapperboard },
  { name: "Sosyal Medya", href: "/admin/sosyal", icon: Share2 },
  { name: "Kategoriler", href: "/admin/kategoriler", icon: Tags },
  { name: "Yazarlar", href: "/admin/yazarlar", icon: Users },
  { name: "Yorumlar", href: "/admin/yorumlar", icon: MessageSquare },
  { name: "Aboneler", href: "/admin/aboneler", icon: Mail },
  { name: "Kullanıcılar", href: "/admin/kullanicilar", icon: Users },
  { name: "Otomasyon", href: "/admin/otomasyon", icon: Zap },
  { name: "Analitik", href: "/admin/analitik", icon: BarChart3 },
  { name: "Ayarlar", href: "/admin/ayarlar", icon: Settings },
];

const PLAN_BADGES: Record<string, { label: string; className: string }> = {
  STARTER: { label: "Starter", className: "bg-zinc-500/10 text-zinc-500" },
  PROFESSIONAL: { label: "Pro", className: "bg-primary/10 text-primary" },
  ENTERPRISE: { label: "Enterprise", className: "bg-amber-500/10 text-amber-600" },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [tenant, setTenant] = useState<TenantInfo | null>(null);

  useEffect(() => {
    fetch("/api/admin/tenant")
      .then((res) => res.json())
      .then((json) => {
        if (json.data) setTenant(json.data);
      })
      .catch(() => {});
  }, []);

  // The login page renders without the admin chrome.
  if (pathname === "/admin/giris") {
    return <SessionProvider>{children}</SessionProvider>;
  }

  const planBadge = tenant ? PLAN_BADGES[tenant.plan] : null;

  return (
    <SessionProvider>
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-border bg-card">
          {/* Tenant Info */}
          <div className="flex h-14 items-center gap-2 border-b border-border px-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Building2 className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">
                {tenant?.name || "Yükleniyor..."}
              </p>
              {planBadge && (
                <span className={cn("text-[10px] font-medium rounded px-1", planBadge.className)}>
                  {planBadge.label}
                </span>
              )}
            </div>
            <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
              ADMIN
            </span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-3">
            <ul className="space-y-1">
              {ADMIN_NAV.map((item) => {
                const isActive = pathname?.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* User */}
          <div className="border-t border-border p-3">
            <button
              onClick={() => signOut({ callbackUrl: "/admin/giris" })}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              Çıkış Yap
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="ml-64 flex-1 p-6">{children}</main>
      </div>
    </SessionProvider>
  );
}
