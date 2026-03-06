import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/authz";
import { listPostingQueue, cancelPost, getPostingStats } from "@/lib/actions/posting-queue";
import type { SNSPlatform } from "@/types/sns";

// GET /api/sns/queue — List posting queue
export async function GET(request: NextRequest) {
  try {
    await requireAuth(["admin", "hq_staff"]);

    const status = request.nextUrl.searchParams.get("status") || undefined;
    const platform = (request.nextUrl.searchParams.get("platform") || undefined) as
      | SNSPlatform
      | undefined;
    const statsOnly = request.nextUrl.searchParams.get("stats") === "true";

    if (statsOnly) {
      const stats = await getPostingStats();
      return NextResponse.json({ data: stats });
    }

    const items = await listPostingQueue({
      status,
      platform,
      limit: 50,
    });

    return NextResponse.json({ data: items });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("Queue list error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/sns/queue — Cancel a pending post
export async function DELETE(request: NextRequest) {
  try {
    await requireAuth(["admin", "hq_staff"]);
    const { queueId } = await request.json();

    if (!queueId) {
      return NextResponse.json(
        { error: "queueId is required" },
        { status: 400 }
      );
    }

    const success = await cancelPost(queueId);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to cancel post (may not be in pending status)" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Queue cancel error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
