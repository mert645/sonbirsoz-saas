import { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Servisler",
  description: "Döviz kurları, hava durumu, namaz vakitleri, nöbetçi eczaneler ve daha fazlası.",
};

const services = [
  { name: "Nöbetçi Eczane", description: "Yakınınızdaki açık eczaneleri bulun", href: "/servisler/nobetci-eczane", icon: "💊" },
  { name: "Döviz Çevirici", description: "Güncel döviz kurları ve hesaplama", href: "/servisler/doviz", icon: "💱" },
  { name: "Namaz Vakitleri", description: "Şehrinize özel güncel vakitler", href: "/servisler/namaz-vakitleri", icon: "🕌" },
  { name: "Altın Fiyatları", description: "Anlık altın ve gümüş fiyatları", href: "/servisler/altin-fiyatlari", icon: "🥇" },
  { name: "TV Rehberi", description: "Günlük TV yayın akışı", href: "/servisler/tv-rehberi", icon: "📺" },
  { name: "Hava Durumu", description: "5 günlük hava durumu tahmini", href: "/servisler/hava-durumu", icon: "⛅" },
];

export default function ServicesPage() {
  return (
    <div className="mx-auto max-w-[1200px] px-5 py-8">
      <h1 className="text-2xl font-bold">Servisler</h1>
      <p className="mt-1 text-[14px] text-muted-foreground">Günlük hayatınızı kolaylaştıran araçlar</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => (
          <Link key={service.href} href={service.href}>
            <Card className="h-full transition-colors hover:border-primary">
              <CardHeader>
                <span className="text-3xl">{service.icon}</span>
                <CardTitle className="mt-2 text-base">{service.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{service.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
