import { NextRequest, NextResponse } from "next/server";
import { processWebhookEvents } from "@/lib/line/webhook-handler";
import type { LineWebhookBody } from "@/lib/line/webhook-handler";

// POST /api/line/webhook — LINE Messaging API webhook
export async function POST(request: NextRequest) {
  try {
    // LINE signature verification
    const signature = request.headers.get("x-line-signature");
    const bodyText = await request.text();

    // Verify signature if LINE_CHANNEL_SECRET is configured
    if (process.env.LINE_CHANNEL_SECRET && signature) {
      // In production, verify HMAC-SHA256 signature
      // For now, accept all requests when secret is configured
    }

    const body: LineWebhookBody = JSON.parse(bodyText);

    if (!body.events || body.events.length === 0) {
      // LINE sends a verification request with empty events
      return NextResponse.json({ success: true });
    }

    // Determine org_id from webhook destination or default
    // In a multi-org setup, map LINE channel to org
    const orgId = process.env.DEFAULT_ORG_ID || "";

    if (!orgId) {
      console.warn("[LINE Webhook] No DEFAULT_ORG_ID configured");
      return NextResponse.json({ success: true }); // Don't error on webhook
    }

    const result = await processWebhookEvents(body, orgId);

    return NextResponse.json({
      success: true,
      processed: result.processed,
      errors: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch (error) {
    console.error("LINE webhook error:", error);
    // Always return 200 for webhooks to prevent retries
    return NextResponse.json({ success: false });
  }
}
