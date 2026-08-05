import { NextResponse } from "next/server";
import { getCurrentTenant } from "@/lib/tenant/get-tenant";

/**
 * Returns the current tenant info for the admin panel
 */
export async function GET() {
  try {
    const tenant = await getCurrentTenant();
    
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    return NextResponse.json({ data: tenant });
  } catch (error) {
    console.error("Tenant bilgisi alınamadı:", error);
    return NextResponse.json({ error: "Tenant bilgisi alınamadı" }, { status: 500 });
  }
}
