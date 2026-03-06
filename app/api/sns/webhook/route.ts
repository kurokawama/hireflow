import { NextRequest, NextResponse } from "next/server";
import { processAllPendingPosts } from "@/lib/sns/posting-service";
import { createAdminClient } from "@/lib/supabase/admin";

// POST /api/sns/webhook — n8n webhook for processing scheduled posts
// Called by n8n scheduler (every 5 minutes) to process pending posts
export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret
    const authHeader = request.headers.get("authorization");
    const webhookSecret = process.env.SNS_WEBHOOK_SECRET;

    if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
      return NextResponse.json({ error: "Invalid webhook secret" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const orgId = body.org_id;

    if (!orgId) {
      // Process all orgs
      const supabase = createAdminClient();
      const { data: orgs } = await supabase
        .from("organizations")
        .select("id");

      const results: Array<{
        org_id: string;
        processed: number;
        succeeded: number;
        failed: number;
      }> = [];

      for (const org of orgs || []) {
        const result = await processAllPendingPosts(org.id);
        if (result.processed > 0) {
          results.push({ org_id: org.id, ...result });
        }
      }

      return NextResponse.json({
        success: true,
        results,
        total_processed: results.reduce((sum, r) => sum + r.processed, 0),
      });
    }

    // Process specific org
    const result = await processAllPendingPosts(orgId);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Processing failed" },
      { status: 500 }
    );
  }
}
