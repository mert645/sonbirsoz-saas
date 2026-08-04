import Link from "next/link";

const STANDINGS = [
  { pos: 1, team: "Galatasaray", p: 38, w: 28, d: 6, l: 4, pts: 90 },
  { pos: 2, team: "Fenerbahçe", p: 38, w: 27, d: 7, l: 4, pts: 88 },
  { pos: 3, team: "Beşiktaş", p: 38, w: 22, d: 8, l: 8, pts: 74 },
  { pos: 4, team: "Trabzonspor", p: 38, w: 18, d: 10, l: 10, pts: 64 },
  { pos: 5, team: "Başakşehir", p: 38, w: 17, d: 9, l: 12, pts: 60 },
  { pos: 6, team: "Samsunspor", p: 38, w: 15, d: 11, l: 12, pts: 56 },
];

export function LeagueStandings() {
  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <h3 className="text-[13px] font-bold uppercase tracking-wide">Süper Lig</h3>
        <div className="h-px flex-1 bg-border" />
        <Link href="/spor" className="text-[11px] font-medium text-primary hover:underline">Tümü</Link>
      </div>

      <table className="w-full text-[12px]">
        <thead>
          <tr className="border-b text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            <th className="pb-2 text-left w-5">#</th>
            <th className="pb-2 text-left">Takım</th>
            <th className="pb-2 text-center w-7">O</th>
            <th className="pb-2 text-center w-7">G</th>
            <th className="pb-2 text-center w-7">M</th>
            <th className="pb-2 text-right w-7">P</th>
          </tr>
        </thead>
        <tbody>
          {STANDINGS.map((t) => (
            <tr key={t.pos} className="border-b border-border/50 last:border-0">
              <td className="py-2 text-left text-muted-foreground">{t.pos}</td>
              <td className="py-2 text-left font-medium text-foreground">{t.team}</td>
              <td className="py-2 text-center text-muted-foreground">{t.p}</td>
              <td className="py-2 text-center text-muted-foreground">{t.w}</td>
              <td className="py-2 text-center text-muted-foreground">{t.l}</td>
              <td className="py-2 text-right font-bold text-foreground">{t.pts}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
