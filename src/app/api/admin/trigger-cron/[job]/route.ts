import { NextRequest, NextResponse } from "next/server";
import { requireEditor } from "@/lib/data/article-mutations";

const ALLOWED_JOBS = ["collect-news", "generate-articles", "social-post"] as const;
type AllowedJob = (typeof ALLOWED_JOBS)[number];

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ job: string }> }
) {
  const user = await requireEditor();
  if (!user) return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });

  const { job } = await params;

  if (!ALLOWED_JOBS.includes(job as AllowedJob)) {
    return NextResponse.json({ error: "Geçersiz görev" }, { status: 400 });
  }

  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET ortam değişkeni tanımlı değil" },
      { status: 500 }
    );
  }

  // Call the cron endpoint server-side — secret never leaves the server
  const base =
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000";

  try {
    const res = await fetch(`${base}/api/cron/${job}?secret=${secret}`, {
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { error: "Cron çağrısı başarısız", details: String(err) },
      { status: 502 }
    );
  }
}
