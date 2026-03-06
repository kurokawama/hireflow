import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runAutoTicketWorkflow } from "@/lib/tickets/auto-workflow";

// POST /api/workflow/auto-ticket
// Trigger the automated ticket workflow for a candidate
// Requires authentication (admin only)
export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { candidate_id } = body;

    if (!candidate_id) {
      return NextResponse.json(
        { error: "candidate_id is required" },
        { status: 400 }
      );
    }

    const result = await runAutoTicketWorkflow(candidate_id);

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("Auto-ticket workflow error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
