import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTicketStats, expireOverdueTickets } from "@/lib/tickets/ticket-service";

// GET /api/tickets/stats — Get ticket statistics
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const { data: member } = await adminClient
      .from("organization_members")
      .select("org_id")
      .eq("auth_user_id", user.id)
      .single();

    if (!member) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Auto-expire overdue tickets first
    await expireOverdueTickets(member.org_id);

    const stats = await getTicketStats(member.org_id);
    return NextResponse.json({ data: stats });
  } catch (error) {
    console.error("Get ticket stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
