"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, SessionProvider, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  Settings,
  LogOut,
  Shield,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SUPERADMIN_NAV = [
  { name: "Dashboard", href: "/superadmin/dashboard", icon: LayoutDashboard },
  { name: "Tenant'lar", href: "/superadmin/tenants", icon: Building2 },
  { name: "Kullanıcılar", href: "/superadmin/users", icon: Users },
  { name: "Abonelikler", href: "/superadmin/billing", icon: CreditCard },
  { name: "Sistem Durumu", href: "/superadmin/system", icon: Activity },
  { name: "Ayarlar", href: "/superadmin/settings", icon: Settings },
];

function SuperAdminContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (status === "loading") return;
    
    if (!session) {
      router.push("/superadmin-giris");
      return;
    }

    if (session.user?.role !== "SUPER_ADMIN") {
      router.push("/admin/dashboard");
    }
  }, [session, status, router, mounted]);

  if (!mounted || status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-500 border-t-transparent" />
      </div>
    );
  }

  if (!session || session.user?.role !== "SUPER_ADMIN") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-border bg-zinc-900">
        {/* Header */}
        <div className="flex h-14 items-center gap-2 border-b border-zinc-800 px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">
              SonBirSöz SaaS
            </p>
            <span className="text-[10px] font-medium text-zinc-400">
              Super Admin
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-1">
            {SUPERADMIN_NAV.map((item) => {
              const isActive = pathname?.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-red-600/20 text-red-400"
                        : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
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
        <div className="border-t border-zinc-800 p-3">
          <div className="mb-2 px-3 py-1">
            <p className="text-xs text-zinc-500">Giriş yapan:</p>
            <p className="text-sm text-zinc-300 truncate">{session.user?.email}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/superadmin-giris" })}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Çıkış Yap
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 flex-1 bg-zinc-950 p-6 text-white">{children}</main>
    </div>
  );
}

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <SuperAdminContent>{children}</SuperAdminContent>
    </SessionProvider>
  );
}
