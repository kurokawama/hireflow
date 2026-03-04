import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const supabase = createAdminClient();

    // Find apply link
    const { data: link, error } = await supabase
      .from("apply_links")
      .select("*, generated_contents(org_id)")
      .eq("code", code)
      .single();

    if (error || !link) {
      // Redirect to homepage if link not found
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Increment click count
    await supabase
      .from("apply_links")
      .update({ click_count: (link.click_count || 0) + 1 })
      .eq("id", link.id);

    // Record click event
    const searchParams = request.nextUrl.searchParams;
    await supabase.from("content_events").insert({
      org_id: link.org_id,
      content_id: link.content_id,
      event: "clicked",
      metadata: {
        channel: link.channel,
        utm_source: searchParams.get("utm_source"),
        utm_medium: searchParams.get("utm_medium"),
        utm_campaign: searchParams.get("utm_campaign"),
        user_agent: request.headers.get("user-agent"),
      },
    });

    // Redirect to target URL
    return NextResponse.redirect(link.target_url);
  } catch (error) {
    console.error("Apply link error:", error);
    return NextResponse.redirect(new URL("/", request.url));
  }
}
