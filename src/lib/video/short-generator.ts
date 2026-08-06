/**
 * Video short generator - Multi-tenant yapıya geçiş nedeniyle devre dışı.
 * TODO: tenantId parametresi ile yeniden implemente edilmeli.
 */

export interface ShortVideoResult {
  jobId: string;
  status: "COMPLETED" | "FAILED";
  videoUrl?: string;
  error?: string;
}

export async function generateShortVideo(
  _articleId: string,
  _tenantId?: string
): Promise<ShortVideoResult> {
  return {
    jobId: "disabled",
    status: "FAILED",
    error: "Video generation is disabled in multi-tenant mode. Will be re-implemented per tenant.",
  };
}

export async function getVideoJobStatus(_jobId: string): Promise<{
  status: string;
  videoUrl?: string;
  error?: string;
}> {
  return {
    status: "FAILED",
    error: "Video generation is disabled in multi-tenant mode.",
  };
}
