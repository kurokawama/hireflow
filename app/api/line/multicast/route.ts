import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendQuizLinkMulticast } from "@/lib/actions/line-multicast";

export async function POST(request: NextRequest) {
  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { campaign_id, line_user_ids, message, include_quiz_url } = body;

    if (!campaign_id || !line_user_ids?.length || !message) {
      return NextResponse.json(
        { error: "campaign_id, line_user_ids, and message are required" },
        { status: 400 }
      );
    }

    if (line_user_ids.length > 500) {
      return NextResponse.json(
        { error: "Maximum 500 recipients per request" },
        { status: 400 }
      );
    }

    const result = await sendQuizLinkMulticast({
      campaign_id,
      line_user_ids,
      message,
      include_quiz_url: include_quiz_url ?? true,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Send failed" },
      { status: 500 }
    );
  }
}
