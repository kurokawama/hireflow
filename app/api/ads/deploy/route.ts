import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/authz";
import { createAdminClient } from "@/lib/supabase/admin";
import { createFullCampaign, activateCampaign } from "@/lib/ads/meta-ads";
import { createYouTubeAdCampaign, activateGoogleCampaign } from "@/lib/ads/google-ads";
import { createXAdCampaign, activateXCampaign } from "@/lib/ads/x-ads";
import type { AdCampaign, AdAudience, TargetingAttributes } from "@/types/ads";

// POST: Deploy an approved campaign to its ad platform
export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth(["admin", "hq_staff"]);
    const body: { campaign_id: string; activate?: boolean } = await request.json();

    if (!body.campaign_id) {
      return NextResponse.json(
        { error: "campaign_id is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get campaign with audience and content
    const { data: campaign } = await supabase
      .from("ad_campaigns")
      .select(`
        *,
        ad_audiences(*),
        generated_contents(body_text, platform)
      `)
      .eq("id", body.campaign_id)
      .eq("org_id", authUser.member.org_id)
      .single();

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    const typedCampaign = campaign as unknown as AdCampaign & {
      ad_audiences: AdAudience;
      generated_contents: { body_text: string; platform: string };
    };

    if (typedCampaign.status !== "approved" && typedCampaign.status !== "draft") {
      return NextResponse.json(
        { error: `Campaign status is ${typedCampaign.status}, must be 'draft' or 'approved'` },
        { status: 400 }
      );
    }

    const attrs = typedCampaign.ad_audiences.targeting_attributes as TargetingAttributes;
    let externalIds: Record<string, string> = {};

    // Deploy to the appropriate platform
    if (typedCampaign.platform === "meta") {
      const result = await createFullCampaign({
        name: typedCampaign.name,
        dailyBudgetCents: typedCampaign.daily_budget_jpy * 100,
        startTime: typedCampaign.start_date || undefined,
        endTime: typedCampaign.end_date || undefined,
        targeting: {
          age_min: attrs.age_min || undefined,
          age_max: attrs.age_max || undefined,
          geo_locations: {
            countries: ["JP"],
          },
        },
        audienceId: typedCampaign.ad_audiences.external_audience_id || undefined,
        adCreative: {
          pageId: process.env.META_PAGE_ID || "",
          message: typedCampaign.generated_contents.body_text,
        },
      });

      externalIds = {
        external_campaign_id: result.campaignId,
        external_ad_set_id: result.adSetId,
        external_ad_id: result.adId,
      };

      // Activate if requested
      if (body.activate) {
        await activateCampaign(result.campaignId);
      }
    } else if (typedCampaign.platform === "google") {
      const result = await createYouTubeAdCampaign({
        name: typedCampaign.name,
        dailyBudgetMicros: typedCampaign.daily_budget_jpy * 1_000_000,
        startDate: typedCampaign.start_date || undefined,
        endDate: typedCampaign.end_date || undefined,
        targeting: {
          ageRanges: getGoogleAgeRanges(attrs.age_min, attrs.age_max),
          locations: ["2392"], // Japan geo target ID
        },
      });

      externalIds = {
        external_campaign_id: result.campaignResourceName,
        external_ad_set_id: result.adGroupResourceName,
      };

      if (body.activate) {
        await activateGoogleCampaign(result.campaignResourceName);
      }
    } else if (typedCampaign.platform === "x") {
      const result = await createXAdCampaign({
        name: typedCampaign.name,
        dailyBudgetCents: typedCampaign.daily_budget_jpy * 100,
        startTime: typedCampaign.start_date || undefined,
        endTime: typedCampaign.end_date || undefined,
        targeting: {
          locations: ["JP"],
          keywords: attrs.interests,
        },
      });

      externalIds = {
        external_campaign_id: result.campaignId,
        external_ad_set_id: result.lineItemId,
      };

      if (body.activate) {
        await activateXCampaign(result.campaignId);
      }
    }

    // Update campaign with external IDs
    const newStatus = body.activate ? "active" : "approved";
    const { data: updated, error: updateError } = await supabase
      .from("ad_campaigns")
      .update({
        ...externalIds,
        status: newStatus,
        approved_by: authUser.userId,
        approved_at: new Date().toISOString(),
      })
      .eq("id", body.campaign_id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: `Deploy succeeded but status update failed: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("POST /api/ads/deploy error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

function getGoogleAgeRanges(
  min?: number | null,
  max?: number | null
): string[] {
  const ranges: string[] = [];
  const ageMin = min ?? 18;
  const ageMax = max ?? 65;

  if (ageMin <= 24 && ageMax >= 18) ranges.push("AGE_RANGE_18_24");
  if (ageMin <= 34 && ageMax >= 25) ranges.push("AGE_RANGE_25_34");
  if (ageMin <= 44 && ageMax >= 35) ranges.push("AGE_RANGE_35_44");
  if (ageMin <= 54 && ageMax >= 45) ranges.push("AGE_RANGE_45_54");
  if (ageMin <= 64 && ageMax >= 55) ranges.push("AGE_RANGE_55_64");
  if (ageMax >= 65) ranges.push("AGE_RANGE_65_UP");

  return ranges.length > 0 ? ranges : ["AGE_RANGE_18_24", "AGE_RANGE_25_34"];
}
