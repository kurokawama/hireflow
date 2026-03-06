import { NextRequest, NextResponse } from "next/server";
import { runAutoTicketWorkflow } from "@/lib/tickets/auto-workflow";

// POST /api/workflow/auto-ticket
// Trigger the automated ticket workflow for a candidate
export async function POST(request: NextRequest) {
  try {
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
