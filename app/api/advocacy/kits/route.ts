import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/authz";
import { createAdminClient } from "@/lib/supabase/admin";
import { generatePostingKit, savePostingKit } from "@/lib/advocacy/kit-generator";

// GET: List posting kits for the org
export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth(["admin", "hq_staff", "store_manager"]);
    const supabase = createAdminClient();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const brand = searchParams.get("brand");

    let query = supabase
      .from("posting_kits")
      .select("*")
      .eq("org_id", authUser.member.org_id)
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }
    if (brand) {
      query = query.eq("brand", brand);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: Generate a new posting kit with AI
export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth(["admin", "hq_staff"]);
    const body: {
      brand: string;
      target_list_id?: string;
      target_audience?: string;
      week_number?: number;
      scheduled_at?: string;
    } = await request.json();

    if (!body.brand) {
      return NextResponse.json(
        { error: "brand is required (dr_stretch or wecle)" },
        { status: 400 }
      );
    }

    // Get previous themes to avoid repetition
    const supabase = createAdminClient();
    const { data: recentKits } = await supabase
      .from("posting_kits")
      .select("theme")
      .eq("org_id", authUser.member.org_id)
      .eq("brand", body.brand)
      .order("created_at", { ascending: false })
      .limit(5);

    const previousThemes = (recentKits || []).map(
      (k: { theme: string }) => k.theme
    );

    // Generate kit with AI
    const kit = await generatePostingKit({
      brand: body.brand,
      targetAudience: body.target_audience,
      weekNumber: body.week_number,
      previousThemes,
    });

    // Save to database
    const kitId = await savePostingKit({
      orgId: authUser.member.org_id,
      userId: authUser.userId,
      kit,
      targetListId: body.target_list_id,
      brand: body.brand,
      scheduledAt: body.scheduled_at,
    });

    return NextResponse.json(
      {
        data: {
          id: kitId,
          ...kit,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("POST /api/advocacy/kits error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH: Update kit status (distribute, archive)
export async function PATCH(request: NextRequest) {
  try {
    const authUser = await requireAuth(["admin", "hq_staff"]);
    const body: {
      kit_id: string;
      status?: string;
    } = await request.json();

    if (!body.kit_id) {
      return NextResponse.json(
        { error: "kit_id is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.status) {
      updateData.status = body.status;
      if (body.status === "distributed") {
        updateData.distributed_at = new Date().toISOString();
      }
    }

    const { data, error } = await supabase
      .from("posting_kits")
      .update(updateData)
      .eq("id", body.kit_id)
      .eq("org_id", authUser.member.org_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Kit not found" }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
