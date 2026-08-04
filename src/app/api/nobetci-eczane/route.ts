import { NextRequest, NextResponse } from "next/server";

export const revalidate = 3600; // 1 saat cache

export async function GET(request: NextRequest) {
  const city = request.nextUrl.searchParams.get("city") ?? "İstanbul";
  const apiKey = process.env.COLLECTAPI_KEY;

  if (!apiKey) {
    return NextResponse.json({ pharmacies: [] }, { status: 503 });
  }

  try {
    const res = await fetch(
      `https://api.collectapi.com/health/dutyPharmacy?ilce=&il=${encodeURIComponent(city)}`,
      {
        headers: {
          "content-type": "application/json",
          authorization: `apikey ${apiKey}`,
        },
        next: { revalidate: 3600 },
      }
    );

    if (!res.ok) {
      return NextResponse.json({ pharmacies: [] }, { status: res.status });
    }

    const data = await res.json();
    const pharmacies = (data.result ?? []).slice(0, 20).map((p: Record<string, string>) => ({
      name:     p.name     ?? "",
      address:  p.address  ?? "",
      phone:    p.phone    ?? "",
      district: p.district ?? "",
    }));

    return NextResponse.json({ pharmacies });
  } catch (err) {
    console.error("Pharmacy API error:", err);
    return NextResponse.json({ pharmacies: [] }, { status: 500 });
  }
}
