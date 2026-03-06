import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/authz";
import { schedulePost } from "@/lib/actions/posting-queue";
import { processPostingQueueItem } from "@/lib/sns/posting-service";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SNSPlatform } from "@/types/sns";

// POST /api/sns/post — Schedule or immediately post content
export async function POST(request: NextRequest) {
  try {
    await requireAuth(["admin", "hq_staff"]);
    const body = await request.json();

    const {
      content_id,
      connection_id,
      platform,
      scheduled_at,
      media_urls,
      immediate,
    } = body as {
      content_id: string;
      connection_id: string;
      platform: SNSPlatform;
      scheduled_at?: string;
      media_urls?: string[];
      immediate?: boolean;
    };

    if (!content_id || !connection_id || !platform) {
      return NextResponse.json(
        { error: "content_id, connection_id, and platform are required" },
        { status: 400 }
      );
    }

    // Create queue item
    const queueItem = await schedulePost({
      content_id,
      connection_id,
      platform,
      scheduled_at: immediate ? null : scheduled_at,
      media_urls,
    });

    if (!queueItem) {
      return NextResponse.json(
        { error: "Failed to create posting queue item" },
        { status: 500 }
      );
    }

    // If immediate, process now
    if (immediate || !scheduled_at) {
      const result = await processPostingQueueItem(queueItem);

      // Re-fetch the updated queue item
      const supabase = createAdminClient();
      const { data: updatedItem } = await supabase
        .from("posting_queue")
        .select("*")
        .eq("id", queueItem.id)
        .single();

      return NextResponse.json({
        data: updatedItem || queueItem,
        posted: result.success,
        external_post_id: result.external_post_id,
        error: result.error,
      });
    }

    return NextResponse.json({
      data: queueItem,
      scheduled: true,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Post error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
