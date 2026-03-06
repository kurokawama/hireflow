import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/authz";
import { sendMessage } from "@/lib/line/messaging";

// POST /api/line/send — Send LINE message to a user
export async function POST(request: NextRequest) {
  try {
    await requireAuth(["admin", "hq_staff"]);

    const body = await request.json();
    const { user_id, message } = body as {
      user_id: string;
      message: string;
    };

    if (!user_id || !message) {
      return NextResponse.json(
        { error: "user_id and message are required" },
        { status: 400 }
      );
    }

    const result = await sendMessage(user_id, [
      { type: "text", text: message },
    ]);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Send failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("LINE send error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
