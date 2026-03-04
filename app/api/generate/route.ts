import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/authz";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateContent } from "@/lib/ai/claude";
import { validateContent } from "@/lib/validators";
import { generateApplyCode, buildApplyUrl } from "@/lib/apply-code";
import type { GenerateRequest, GenerateResponse } from "@/types/dto";

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth(["admin", "hq_staff", "store_manager"]);
    const body: GenerateRequest = await request.json();
    const { store_id, profile_id, template_type, platforms } = body;

    const supabase = createAdminClient();

    // Fetch profile
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", profile_id)
      .single();

    if (profileErr || !profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    // Fetch store
    const { data: store, error: storeErr } = await supabase
      .from("stores")
      .select("*")
      .eq("id", store_id)
      .single();

    if (storeErr || !store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    // Fetch approved staff voices for this store (max 5)
    const { data: staffVoices } = await supabase
      .from("staff_voices")
      .select("*")
      .eq("store_id", store_id)
      .eq("consent_status", "approved")
      .limit(5);

    // Fetch prompt templates for requested platforms
    const { data: templates } = await supabase
      .from("prompt_templates")
      .select("*")
      .eq("template_type", template_type)
      .in("platform", platforms)
      .eq("is_active", true);

    // Generate apply codes for each platform
    const applyLinks: Record<string, string> = {};
    for (const platform of platforms) {
      const code = generateApplyCode();
      applyLinks[platform] = buildApplyUrl(code);
    }

    // Create generation request record
    const { data: genRequest, error: genErr } = await supabase
      .from("generation_requests")
      .insert({
        org_id: authUser.member.org_id,
        store_id,
        profile_id,
        template_type,
        platforms,
        requested_by: authUser.userId,
        input_snapshot: { profile, store, staffVoices },
        status: "pending",
      })
      .select()
      .single();

    if (genErr || !genRequest) {
      return NextResponse.json(
        { error: "Failed to create generation request" },
        { status: 500 }
      );
    }

    // Call Claude API
    let platformContents;
    try {
      platformContents = await generateContent({
        profile,
        store,
        staffVoices: staffVoices || [],
        templates: templates || [],
        platforms,
        applyLinks,
      });
    } catch (aiError) {
      await supabase
        .from("generation_requests")
        .update({
          status: "failed",
          error_message:
            aiError instanceof Error ? aiError.message : "AI generation failed",
        })
        .eq("id", genRequest.id);

      return NextResponse.json(
        { error: "Content generation failed" },
        { status: 500 }
      );
    }

    // Validate and save each platform's content
    const savedContents = [];
    for (const content of platformContents) {
      // Validate
      const validation = validateContent(
        content.body_text,
        profile.ng_words || [],
        profile.must_include || []
      );

      if (!validation.valid) {
        // Log validation failure but still save as draft
        content.compliance_notes.push(...validation.errors);
      }

      // Save generated content
      const { data: savedContent } = await supabase
        .from("generated_contents")
        .insert({
          org_id: authUser.member.org_id,
          generation_request_id: genRequest.id,
          store_id,
          platform: content.platform,
          channel: "organic",
          template_type,
          body_text: content.body_text,
          parts_json: content.parts_json,
          status: "draft",
          version: 1,
        })
        .select()
        .single();

      if (savedContent) {
        // Save apply link
        const code = Object.entries(applyLinks)
          .find(([p]) => p === content.platform)?.[1]
          ?.split("/")
          .pop();

        if (code) {
          await supabase.from("apply_links").insert({
            org_id: authUser.member.org_id,
            content_id: savedContent.id,
            store_id,
            code,
            target_url: `${process.env.APP_BASE_URL || ""}/quiz?store=${store_id}`,
            channel: "organic",
          });
        }

        savedContents.push({
          content_id: savedContent.id,
          platform: content.platform,
          body_text: content.body_text,
          parts_json: content.parts_json,
          apply_link: applyLinks[content.platform] || "",
        });
      }
    }

    // Update generation request status
    await supabase
      .from("generation_requests")
      .update({ status: "completed" })
      .eq("id", genRequest.id);

    const response: GenerateResponse = {
      contents: savedContents,
      generation_request_id: genRequest.id,
    };

    return NextResponse.json({ data: response });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("Generate error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
