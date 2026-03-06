import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/authz";
import { exchangeCodeForToken } from "@/lib/sns/oauth-handler";
import { createSNSConnection } from "@/lib/actions/sns-connections";
import type { SNSPlatform } from "@/types/sns";

// GET /api/sns/callback/[platform] — OAuth callback handler
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  try {
    await requireAuth(["admin", "hq_staff"]);
    const { platform } = await params;
    const snsPlatform = platform as SNSPlatform;

    const code = request.nextUrl.searchParams.get("code");
    const error = request.nextUrl.searchParams.get("error");

    if (error) {
      const redirectUrl = new URL("/settings/connections", request.nextUrl.origin);
      redirectUrl.searchParams.set("error", error);
      return NextResponse.redirect(redirectUrl);
    }

    if (!code) {
      return NextResponse.json(
        { error: "Missing authorization code" },
        { status: 400 }
      );
    }

    // Exchange code for token
    const tokenResult = await exchangeCodeForToken(snsPlatform, code);

    if (!tokenResult) {
      const redirectUrl = new URL("/settings/connections", request.nextUrl.origin);
      redirectUrl.searchParams.set("error", "token_exchange_failed");
      return NextResponse.redirect(redirectUrl);
    }

    // Save connection
    const connection = await createSNSConnection({
      platform: snsPlatform,
      access_token: tokenResult.access_token,
      refresh_token: tokenResult.refresh_token || null,
      token_expires_at: tokenResult.expires_in
        ? new Date(Date.now() + tokenResult.expires_in * 1000).toISOString()
        : null,
      external_account_id: tokenResult.account_id || null,
      external_account_name: tokenResult.account_name || null,
      account_metadata: tokenResult.metadata || {},
    });

    if (!connection) {
      const redirectUrl = new URL("/settings/connections", request.nextUrl.origin);
      redirectUrl.searchParams.set("error", "save_failed");
      return NextResponse.redirect(redirectUrl);
    }

    // Success — redirect back to connections page
    const redirectUrl = new URL("/settings/connections", request.nextUrl.origin);
    redirectUrl.searchParams.set("connected", platform);
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("OAuth callback error:", error);
    const redirectUrl = new URL("/settings/connections", request.nextUrl.origin);
    redirectUrl.searchParams.set("error", "internal_error");
    return NextResponse.redirect(redirectUrl);
  }
}
