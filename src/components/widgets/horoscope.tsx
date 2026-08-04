"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const SIGNS = [
  { name: "Koç", symbol: "♈", comment: "İş hayatınızda beklenmedik fırsatlar kapınızı çalabilir. Cesur adımlar atmanın zamanı geldi." },
  { name: "Boğa", symbol: "♉", comment: "Finansal konularda dikkatli olmanız gereken bir gün. Büyük harcamalardan kaçının." },
  { name: "İkizler", symbol: "♊", comment: "İletişim yetenekleriniz zirve yapıyor. Yeni bağlantılar kurmak için ideal." },
  { name: "Yengeç", symbol: "♋", comment: "Aile ilişkilerinizde sıcak bir gün sizi bekliyor. Sevdiklerinize vakit ayırın." },
  { name: "Aslan", symbol: "♌", comment: "Liderlik özellikleriniz ön plana çıkıyor. İş yerinde takdir göreceksiniz." },
  { name: "Başak", symbol: "♍", comment: "Detaylara olan dikkatiniz bugün ödüllendirilecek. Sağlığınıza özen gösterin." },
  { name: "Terazi", symbol: "♎", comment: "İlişkilerinizde denge kurmanız gereken bir dönem. Uzlaşma başarı getirir." },
  { name: "Akrep", symbol: "♏", comment: "Sezgileriniz güçlü. İç sesinizi dinleyin, doğru kararları vereceksiniz." },
  { name: "Yay", symbol: "♐", comment: "Macera ruhunuz depreşiyor. Yeni yerler keşfetmek için harika bir gün." },
  { name: "Oğlak", symbol: "♑", comment: "Kariyer hedeflerinize odaklanın. Disiplinli çalışmanız meyvesini verecek." },
  { name: "Kova", symbol: "♒", comment: "Yaratıcılığınız dorukta. Alışılmadık fikirleriniz ilgiyle karşılanacak." },
  { name: "Balık", symbol: "♓", comment: "Duygusal bir gün sizi bekliyor. Sanat ve müzikle huzur bulabilirsiniz." },
];

export function HoroscopeWidget() {
  const [selected, setSelected] = useState(0);
  const sign = SIGNS[selected];

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <h3 className="text-[13px] font-bold uppercase tracking-wide">Günlük Burç</h3>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Sign grid */}
      <div className="grid grid-cols-4 gap-1">
        {SIGNS.map((s, i) => (
          <button
            key={s.name}
            onClick={() => setSelected(i)}
            className={cn(
              "flex flex-col items-center gap-0.5 rounded-md py-2 transition-colors",
              selected === i
                ? "bg-primary/10 dark:bg-primary/20"
                : "hover:bg-muted"
            )}
          >
            <span className={cn(
              "text-[16px]",
              selected === i && "scale-110"
            )}>{s.symbol}</span>
            <span className={cn(
              "text-[9px] font-medium",
              selected === i ? "text-primary" : "text-muted-foreground"
            )}>{s.name}</span>
          </button>
        ))}
      </div>

      {/* Selected sign commentary */}
      <div className="mt-3 rounded-md bg-muted/60 p-3 dark:bg-muted">
        <div className="flex items-center gap-2">
          <span className="text-[20px]">{sign.symbol}</span>
          <span className="text-[13px] font-bold text-foreground">{sign.name}</span>
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">{sign.comment}</p>
      </div>
    </div>
  );
}
