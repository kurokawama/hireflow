import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/authz";
import { getOrgFunnelSummary } from "@/lib/actions/entry-tracking";

// GET /api/tracking/funnel — Get funnel metrics
export async function GET(request: NextRequest) {
  try {
    await requireAuth(["admin", "hq_staff"]);

    const days = parseInt(request.nextUrl.searchParams.get("days") || "30", 10);
    const summary = await getOrgFunnelSummary(days);

    return NextResponse.json({ data: summary });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Funnel metrics error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
