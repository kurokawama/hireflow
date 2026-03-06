import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// POST /api/apply — Public application form submission
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { candidate_id, name, phone, email, preferred_date, time_slot, message } = body;

    if (!name || !phone) {
      return NextResponse.json(
        { error: "お名前と電話番号は必須です" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get the organization (single org)
    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .single();

    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 500 }
      );
    }

    // If candidate_id is provided, update the candidate record
    if (candidate_id) {
      await supabase
        .from("candidates")
        .update({
          name: name || undefined,
          email: email || undefined,
          phone: phone || undefined,
          stage: "applied",
        })
        .eq("id", candidate_id);

      // Record event
      await supabase.from("candidate_events").insert({
        org_id: org.id,
        candidate_id,
        event: "applied",
        metadata: {
          preferred_date,
          time_slot,
          message,
        },
      });
    } else {
      // Create a new candidate record if no candidate_id
      const { data: newCandidate } = await supabase
        .from("candidates")
        .insert({
          org_id: org.id,
          name,
          email: email || null,
          phone: phone || null,
          source_channel: "direct",
          stage: "applied",
          quiz_answers: {},
          ai_score: 0,
          score_factors: {},
        })
        .select()
        .single();

      if (newCandidate) {
        await supabase.from("candidate_events").insert({
          org_id: org.id,
          candidate_id: newCandidate.id,
          event: "applied",
          metadata: {
            preferred_date,
            time_slot,
            message,
          },
        });
      }
    }

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("Apply error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
