import { NextResponse } from "next/server";
import { getOpenApiSpec } from "@/lib/api/openapi";

export const dynamic = "force-dynamic";

/**
 * OpenAPI JSON endpoint
 * GET /api/docs/openapi.json
 */
export async function GET() {
  const spec = getOpenApiSpec();
  
  return NextResponse.json(spec, {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
