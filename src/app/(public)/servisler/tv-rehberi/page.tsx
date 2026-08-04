import { Metadata } from "next";

export const metadata: Metadata = {
  title: "TV Rehberi",
  description: "Günlük TV yayın akışı. Tüm kanalların güncel program bilgileri.",
};

const CHANNELS = [
  {
    name: "TRT 1",
    programs: [
      { time: "08:00", title: "Günaydın Türkiye" },
      { time: "10:00", title: "Gönül Dağı (Tekrar)" },
      { time: "13:00", title: "Haber" },
      { time: "14:00", title: "Masallar" },
      { time: "20:00", title: "Ana Haber Bülteni", current: true },
      { time: "21:00", title: "Gönül Dağı (Yeni Bölüm)" },
    ],
  },
  {
    name: "ATV",
    programs: [
      { time: "08:00", title: "Kahvaltı Haberleri" },
      { time: "10:00", title: "Müge Anlı ile Tatlı Sert" },
      { time: "13:00", title: "ATV Haber" },
      { time: "14:00", title: "Esra Erol'da" },
      { time: "19:00", title: "Ana Haber", current: true },
      { time: "20:00", title: "Kuruluş Osman" },
    ],
  },
  {
    name: "Show TV",
    programs: [
      { time: "08:00", title: "Sabah Haberleri" },
      { time: "10:00", title: "Didem Arslan Yılmaz'la" },
      { time: "13:00", title: "Show Ana Haber" },
      { time: "14:30", title: "Her Şey Güzel" },
      { time: "19:00", title: "Show Ana Haber", current: true },
      { time: "20:00", title: "Kızılcık Şerbeti" },
    ],
  },
  {
    name: "Star TV",
    programs: [
      { time: "09:00", title: "Sabah Programı" },
      { time: "11:00", title: "Magazin" },
      { time: "13:30", title: "Star Haber" },
      { time: "15:00", title: "Dizi Tekrar" },
      { time: "19:00", title: "Star Ana Haber", current: true },
      { time: "20:00", title: "Öğretmen" },
    ],
  },
];

export default function TvRehberiPage() {
  return (
    <div className="mx-auto max-w-[1200px] px-5 py-8">
      <h1 className="text-2xl font-bold">TV Rehberi</h1>
      <p className="mt-1 text-[14px] text-muted-foreground">
        Günlük yayın akışı — {new Date().toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" })}
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {CHANNELS.map((ch) => (
          <div key={ch.name} className="rounded-lg border border-border">
            <div className="border-b bg-muted/50 px-4 py-3">
              <h3 className="text-[14px] font-bold">{ch.name}</h3>
            </div>
            <div className="divide-y divide-border/50">
              {ch.programs.map((p, i) => (
                <div key={i} className={`flex items-center gap-3 px-4 py-2.5 ${p.current ? "bg-primary/5" : ""}`}>
                  <span className={`text-[12px] font-mono ${p.current ? "font-bold text-primary" : "text-muted-foreground"}`}>{p.time}</span>
                  <span className={`text-[13px] ${p.current ? "font-bold text-foreground" : "text-foreground/80"}`}>{p.title}</span>
                  {p.current && <span className="ml-auto rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">CANLI</span>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
