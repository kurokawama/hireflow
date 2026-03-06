import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/authz";
import { generateAuthUrl, isOAuthConfigured } from "@/lib/sns/oauth-handler";
import { createMockConnection } from "@/lib/actions/sns-connections";
import type { SNSPlatform } from "@/types/sns";

// GET /api/sns/connect/[platform] — Start OAuth flow or create mock connection
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  try {
    await requireAuth(["admin", "hq_staff"]);
    const { platform } = await params;
    const snsPlatform = platform as SNSPlatform;

    // Check if OAuth is configured for this platform
    if (isOAuthConfigured(snsPlatform)) {
      // Generate state token for CSRF protection
      const state = crypto.randomUUID();
      // In production, store state in session/cookie for verification

      const authResult = generateAuthUrl(snsPlatform, state);
      if (!authResult) {
        return NextResponse.json(
          { error: "OAuth not configured for this platform" },
          { status: 400 }
        );
      }

      // Redirect to OAuth provider
      return NextResponse.redirect(authResult.url);
    }

    // No OAuth configured — create mock connection
    const mockName = request.nextUrl.searchParams.get("account_name") || `${platform} Account`;
    const connection = await createMockConnection(snsPlatform, mockName);

    if (!connection) {
      return NextResponse.json(
        { error: "Failed to create connection" },
        { status: 500 }
      );
    }

    // Redirect back to connections page
    const redirectUrl = new URL("/settings/connections", request.nextUrl.origin);
    redirectUrl.searchParams.set("connected", platform);
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("Connect error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
