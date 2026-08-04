import { NextRequest, NextResponse } from "next/server";
import { pollImageJob } from "@/lib/ai/media-generator";
import { requireEditor } from "@/lib/data/article-mutations";

export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const cronSecret = request.headers.get("x-cron-secret");
  const isCron = !!cronSecret && cronSecret === process.env.CRON_SECRET;

  if (!isCron) {
    const user = await requireEditor();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const jobId = request.nextUrl.searchParams.get("jobId");
  if (!jobId) {
    return NextResponse.json({ error: "jobId zorunlu" }, { status: 400 });
  }

  const result = await pollImageJob(jobId);
  return NextResponse.json({
    success: true,
    status: result.status,
    imageUrl: result.imageUrl,
    width: result.width,
    height: result.height,
  });
}
