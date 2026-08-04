import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-8xl font-black text-zinc-800">404</h1>
        <p className="mt-4 text-xl font-semibold text-zinc-300">
          Sayfa bulunamadı
        </p>
        <p className="mt-2 text-sm text-zinc-500">
          Aradığınız sayfa kaldırılmış veya taşınmış olabilir.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-500"
        >
          <ArrowLeft className="h-4 w-4" />
          Ana Sayfaya Dön
        </Link>
      </div>
    </div>
  );
}
