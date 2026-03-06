import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/authz";
import { listEntryEvents } from "@/lib/actions/entry-tracking";
import { trackFunnelEvent } from "@/lib/tracking/funnel";
import type { FunnelStep } from "@/types/tracking";

// GET /api/tracking/events — List tracking events
export async function GET(request: NextRequest) {
  try {
    await requireAuth(["admin", "hq_staff"]);

    const funnelStep = request.nextUrl.searchParams.get("funnel_step") || undefined;
    const entrySource = request.nextUrl.searchParams.get("entry_source") || undefined;

    const events = await listEntryEvents({
      funnel_step: funnelStep,
      entry_source: entrySource,
      limit: 100,
    });

    return NextResponse.json({ data: events });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("List events error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/tracking/events — Record a tracking event
export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth(["admin", "hq_staff"]);

    const body = await request.json();
    const { funnel_step, entry_source, referral_platform, candidate_id, posting_queue_id, metadata } = body;

    if (!funnel_step || !entry_source) {
      return NextResponse.json(
        { error: "funnel_step and entry_source are required" },
        { status: 400 }
      );
    }

    const success = await trackFunnelEvent({
      org_id: authUser.member.org_id,
      funnel_step: funnel_step as FunnelStep,
      entry_source,
      referral_platform,
      candidate_id,
      posting_queue_id,
      metadata,
    });

    if (!success) {
      return NextResponse.json(
        { error: "Failed to track event" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Track event error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
