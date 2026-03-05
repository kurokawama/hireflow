import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/authz";
import { searchYouTubeChannels } from "@/lib/youtube/search";

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth(["admin", "hq_staff", "store_manager"]);
    const body: { query: string; max_results?: number } = await request.json();

    if (!body.query?.trim()) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const results = await searchYouTubeChannels(
      body.query.trim(),
      authUser.member.org_id,
      body.max_results || 10
    );

    return NextResponse.json({ data: results });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (
      error instanceof Error &&
      error.message === "YOUTUBE_API_KEY is not configured"
    ) {
      return NextResponse.json(
        { error: "YouTube API is not configured" },
        { status: 503 }
      );
    }
    console.error("POST /api/targets/search/youtube error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
