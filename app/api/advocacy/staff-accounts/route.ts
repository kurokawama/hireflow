import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/authz";
import { createAdminClient } from "@/lib/supabase/admin";

// GET: List staff SNS accounts
export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth([
      "admin",
      "hq_staff",
      "store_manager",
    ]);
    const supabase = createAdminClient();

    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get("store_id");
    const platform = searchParams.get("platform");
    const championsOnly = searchParams.get("champions_only") === "true";

    let query = supabase
      .from("staff_sns_accounts")
      .select(`
        *,
        stores(store_name, brand)
      `)
      .eq("org_id", authUser.member.org_id)
      .order("created_at", { ascending: false });

    if (storeId) {
      query = query.eq("store_id", storeId);
    }
    if (platform) {
      query = query.eq("platform", platform);
    }
    if (championsOnly) {
      query = query.eq("is_champion", true);
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

// POST: Register a staff SNS account
export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth([
      "admin",
      "hq_staff",
      "store_manager",
      "trainer",
    ]);
    const body: {
      user_id?: string; // Admin can register for other users
      platform: string;
      username: string;
      follower_count?: number;
      store_id?: string;
    } = await request.json();

    if (!body.platform || !body.username) {
      return NextResponse.json(
        { error: "platform and username are required" },
        { status: 400 }
      );
    }

    // Trainers can only register their own accounts
    const targetUserId =
      authUser.member.role === "trainer"
        ? authUser.userId
        : body.user_id || authUser.userId;

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("staff_sns_accounts")
      .insert({
        org_id: authUser.member.org_id,
        user_id: targetUserId,
        platform: body.platform,
        username: body.username.replace(/^@/, ""),
        follower_count: body.follower_count || null,
        store_id: body.store_id || authUser.member.store_id || null,
        is_champion: false,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "This platform account is already registered for this user" },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("POST /api/advocacy/staff-accounts error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH: Update staff SNS account (champion status, follower count)
export async function PATCH(request: NextRequest) {
  try {
    const authUser = await requireAuth(["admin", "hq_staff", "store_manager"]);
    const body: {
      account_id: string;
      is_champion?: boolean;
      follower_count?: number;
      username?: string;
    } = await request.json();

    if (!body.account_id) {
      return NextResponse.json(
        { error: "account_id is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.is_champion !== undefined) updateData.is_champion = body.is_champion;
    if (body.follower_count !== undefined)
      updateData.follower_count = body.follower_count;
    if (body.username) updateData.username = body.username.replace(/^@/, "");

    const { data, error } = await supabase
      .from("staff_sns_accounts")
      .update(updateData)
      .eq("id", body.account_id)
      .eq("org_id", authUser.member.org_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json(
        { error: "Staff account not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE: Remove a staff SNS account
export async function DELETE(request: NextRequest) {
  try {
    const authUser = await requireAuth(["admin", "hq_staff"]);
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("id");

    if (!accountId) {
      return NextResponse.json(
        { error: "id query parameter is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { error } = await supabase
      .from("staff_sns_accounts")
      .delete()
      .eq("id", accountId)
      .eq("org_id", authUser.member.org_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
