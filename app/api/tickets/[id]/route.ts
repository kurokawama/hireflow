import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Helper: get org_id from authenticated user
async function getOrgId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const adminClient = createAdminClient();
  const { data: member } = await adminClient
    .from("organization_members")
    .select("org_id")
    .eq("auth_user_id", user.id)
    .single();

  return member?.org_id || null;
}

// GET /api/tickets/[id] — Get ticket detail
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const orgId = await getOrgId();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("experience_tickets")
      .select(
        `*, candidates(id, name, email, phone, line_user_id, ai_score, stage)`
      )
      .eq("id", id)
      .eq("org_id", orgId)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Get ticket error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/tickets/[id] — Update ticket (cancel, etc)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const orgId = await getOrgId();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const supabase = createAdminClient();

    // Only allow status updates
    const allowedFields = ["status", "metadata"];
    const updateData: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("experience_tickets")
      .update(updateData)
      .eq("id", id)
      .eq("org_id", orgId)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Failed to update ticket" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Update ticket error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
