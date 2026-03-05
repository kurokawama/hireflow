import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/authz";
import { applyRevision } from "@/lib/actions/content-revisions";
import type { ApplyRevisionRequest } from "@/types/conversation";

interface RouteParams {
  params: { contentId: string };
}

// POST — apply an AI revision to the content
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth(["admin", "hq_staff"]);
    const body: ApplyRevisionRequest = await request.json();

    if (!body.message_id) {
      return NextResponse.json(
        { error: "message_id is required" },
        { status: 400 }
      );
    }

    const result = await applyRevision(params.contentId, body.message_id);

    return NextResponse.json({ data: result });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (error instanceof Error && error.message === "Revision not found") {
      return NextResponse.json(
        { error: "Revision not found" },
        { status: 404 }
      );
    }
    console.error("Revise POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
