import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Loader2 } from "lucide-react";
import { LoginForm } from "./login-form";
import { isAuthBypassEnabled } from "@/lib/auth-guard";

// Login sayfası kullanıcıya özel (arama parametreleri + oturum) olduğundan
// build zamanında statik prerender edilmemeli; her istekte dinamik render.
export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
  // Demo/no-DB mode: giriş yok, doğrudan panele. (Üretimde asla etkin değildir.)
  if (isAuthBypassEnabled()) {
    redirect("/admin/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Suspense fallback={<Loader2 className="h-6 w-6 animate-spin" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
