import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function POST(request: NextRequest) {
  // Secret yalnızca header ile kabul edilir (query string log sızıntısı riski).
  const secret = request.headers.get("x-revalidate-secret");

  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { path } = await request.json();

  if (!path) {
    return NextResponse.json({ error: "Path is required" }, { status: 400 });
  }

  revalidatePath(path);

  return NextResponse.json({ revalidated: true, path });
}
