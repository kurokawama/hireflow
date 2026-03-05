import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/authz";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getOrCreateConversation,
  getMessages,
  saveHumanMessage,
  saveAIMessage,
} from "@/lib/actions/conversations";
import { conversationChat } from "@/lib/ai/conversation-agent";
import type { SendMessageRequest } from "@/types/conversation";

interface RouteParams {
  params: { contentId: string };
}

// GET — fetch conversation + messages for a content item
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth();
    const conversation = await getOrCreateConversation(params.contentId);
    const messages = await getMessages(conversation.id);

    return NextResponse.json({
      data: { conversation, messages },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Content not found") {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }
    console.error("Conversation GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST — send a message and get AI response
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const authUser = await requireAuth(["admin", "hq_staff", "store_manager"]);
    const body: SendMessageRequest = await request.json();

    if (!body.message || body.message.trim().length === 0) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Fetch content with related data for AI context
    const { data: content, error: contentErr } = await supabase
      .from("generated_contents")
      .select("*")
      .eq("id", params.contentId)
      .eq("org_id", authUser.member.org_id)
      .single();

    if (contentErr || !content) {
      return NextResponse.json(
        { error: "Content not found" },
        { status: 404 }
      );
    }

    // Fetch profile from generation request
    const { data: genRequest } = await supabase
      .from("generation_requests")
      .select("profile_id, store_id")
      .eq("id", content.generation_request_id)
      .single();

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", genRequest?.profile_id)
      .single();

    const { data: store } = await supabase
      .from("stores")
      .select("*")
      .eq("id", content.store_id)
      .single();

    if (!profile || !store) {
      return NextResponse.json(
        { error: "Profile or store not found" },
        { status: 404 }
      );
    }

    // Get or create conversation
    const conversation = await getOrCreateConversation(params.contentId);
    const existingMessages = await getMessages(conversation.id);

    // Save human message
    const humanMsg = await saveHumanMessage(
      conversation.id,
      body.message.trim()
    );

    // Call AI with full context
    const aiResponse = await conversationChat(
      {
        content,
        profile,
        store,
        messages: [...existingMessages, humanMsg],
      },
      body.message.trim()
    );

    // Save AI response
    const aiMsg = await saveAIMessage(
      conversation.id,
      aiResponse.message,
      aiResponse.revised_body_text,
      aiResponse.revised_parts_json
    );

    return NextResponse.json({
      data: {
        human_message: humanMsg,
        ai_message: aiMsg,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("Conversation POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
