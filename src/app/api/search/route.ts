import { NextRequest, NextResponse } from "next/server";
import { searchArticles } from "@/lib/data/articles";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";
  const category = searchParams.get("category") || undefined;

  if (query.trim().length < 2) {
    return NextResponse.json({ data: [] });
  }

  const results = await searchArticles(query, {
    categorySlug: category,
    limit: 24,
  });

  return NextResponse.json({ data: results });
}
