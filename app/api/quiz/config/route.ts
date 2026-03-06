import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { trackFunnelEvent } from "@/lib/tracking/funnel";

export async function GET(request: NextRequest) {
  try {
    const campaignSlug = request.nextUrl.searchParams.get("campaign");
    const supabase = createAdminClient();

    let campaignQuery = supabase
      .from("quiz_campaigns")
      .select(`
        id, name, brand,
        quiz_questions (
          id, question_key, question_text, question_type, sort_order, is_required,
          quiz_options (id, option_value, option_label, sort_order)
        )
      `)
      .eq("is_active", true);

    if (campaignSlug) {
      campaignQuery = campaignQuery.eq("slug", campaignSlug);
    } else {
      campaignQuery = campaignQuery.eq("is_default", true);
    }

    const { data: campaign, error } = await campaignQuery.single();

    if (error || !campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    // Sort questions and options by sort_order
    type QRow = { sort_order: number; quiz_options?: Array<{ sort_order: number }> };
    const rawQuestions = (campaign.quiz_questions || []) as QRow[];
    const questions = rawQuestions
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((q) => ({
        ...q,
        quiz_options: (q.quiz_options || []).sort(
          (a, b) => a.sort_order - b.sort_order
        ),
      }));

    const response = {
      campaign_id: campaign.id,
      campaign_name: campaign.name,
      brand: campaign.brand,
      questions,
    };

    // Track quiz_start funnel event (non-blocking)
    // Get org_id from the campaign's related data
    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .single();

    if (org) {
      trackFunnelEvent({
        org_id: org.id,
        funnel_step: "quiz_start",
        entry_source: "direct",
        metadata: { campaign_id: campaign.id, campaign_name: campaign.name },
      }).catch((err) =>
        console.error("Funnel tracking error:", err)
      );
    }

    return NextResponse.json({ data: response });
  } catch (err) {
    console.error("Quiz config error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
