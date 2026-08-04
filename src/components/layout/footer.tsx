import Link from "next/link";
import { SITE_NAME, CATEGORIES, SOCIAL_LINKS } from "@/lib/utils/constants";

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30 dark:bg-[#0a0a0c]">
      <div className="mx-auto max-w-7xl px-4 py-14">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <img
                src="/icons/icon-128.png"
                alt={SITE_NAME}
                className="h-8 w-8 rounded bg-white object-cover"
              />
              <span className="text-lg font-extrabold tracking-tight">{SITE_NAME}</span>
            </Link>
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              Tarafsız ve güvenilir haberin dijital adresi. Güncel gelişmeleri en
              doğru şekilde sizlere ulaştırmayı hedefliyoruz.
            </p>
            {/* Social Links */}
            <div className="flex items-center gap-2 pt-2">
              <a
                href={SOCIAL_LINKS.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-all hover:bg-primary hover:text-primary-foreground"
                aria-label="X (Twitter)"
              >
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href={SOCIAL_LINKS.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-all hover:bg-primary hover:text-primary-foreground"
                aria-label="Instagram"
              >
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
              </a>
              <a
                href={SOCIAL_LINKS.youtube}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-all hover:bg-primary hover:text-primary-foreground"
                aria-label="YouTube"
              >
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </a>
              <a
                href={SOCIAL_LINKS.telegram}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-all hover:bg-primary hover:text-primary-foreground"
                aria-label="Telegram"
              >
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Categories */}
          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Kategoriler
            </h3>
            <ul className="space-y-2.5">
              {CATEGORIES.slice(0, 8).map((cat) => (
                <li key={cat.slug}>
                  <Link
                    href={`/${cat.slug}`}
                    className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Servisler
            </h3>
            <ul className="space-y-2.5">
              <li><Link href="/servisler/doviz" className="text-[13px] text-muted-foreground transition-colors hover:text-foreground">Döviz Kurları</Link></li>
              <li><Link href="/servisler/hava-durumu" className="text-[13px] text-muted-foreground transition-colors hover:text-foreground">Hava Durumu</Link></li>
              <li><Link href="/servisler/namaz-vakitleri" className="text-[13px] text-muted-foreground transition-colors hover:text-foreground">Namaz Vakitleri</Link></li>
              <li><Link href="/servisler/nobetci-eczane" className="text-[13px] text-muted-foreground transition-colors hover:text-foreground">Nöbetçi Eczaneler</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Kurumsal
            </h3>
            <ul className="space-y-2.5">
              <li><Link href="/hakkimizda" className="text-[13px] text-muted-foreground transition-colors hover:text-foreground">Hakkımızda</Link></li>
              <li><Link href="/kunye" className="text-[13px] text-muted-foreground transition-colors hover:text-foreground">Künye</Link></li>
              <li><Link href="/iletisim" className="text-[13px] text-muted-foreground transition-colors hover:text-foreground">İletişim</Link></li>
              <li><Link href="/kvkk" className="text-[13px] text-muted-foreground transition-colors hover:text-foreground">KVKK Aydınlatma</Link></li>
              <li><Link href="/rss" className="text-[13px] text-muted-foreground transition-colors hover:text-foreground">RSS</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 border-t border-border pt-6">
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-[11px] text-muted-foreground">
              &copy; {new Date().getFullYear()} {SITE_NAME}. Tüm hakları saklıdır.
            </p>
            <p className="text-[11px] text-muted-foreground">
              Sitede yer alan haberlerin tüm sorumlulukları kaynaklarına aittir.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
