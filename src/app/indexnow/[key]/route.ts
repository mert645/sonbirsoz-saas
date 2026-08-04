import { NextResponse } from "next/server";

/**
 * IndexNow anahtar doğrulama dosyası: /{INDEXNOW_KEY}.txt
 * Arama motorları anahtarın sahipliğini bu dosyadan doğrular.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key: raw } = await params;
  const requested = raw.replace(/\.txt$/, "");
  const key = process.env.INDEXNOW_KEY;

  if (!key || requested !== key) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return new NextResponse(key, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
