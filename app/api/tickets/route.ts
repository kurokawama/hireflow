import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { listTickets } from "@/lib/tickets/ticket-service";
import { issueTicket, sendTicketViaLine } from "@/lib/tickets/ticket-service";
import type { TicketType, TicketIssuedVia } from "@/types/tickets";

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

// GET /api/tickets — List tickets
export async function GET(request: NextRequest) {
  try {
    const orgId = await getOrgId();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const result = await listTickets(orgId, { status, limit, offset });

    return NextResponse.json({ data: result.tickets, count: result.count });
  } catch (error) {
    console.error("List tickets error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/tickets — Issue a new ticket
export async function POST(request: NextRequest) {
  try {
    const orgId = await getOrgId();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      candidate_id,
      ticket_type,
      issued_via,
      expiry_days,
      send_line,
    }: {
      candidate_id: string;
      ticket_type?: TicketType;
      issued_via?: TicketIssuedVia;
      expiry_days?: number;
      send_line?: boolean;
    } = body;

    if (!candidate_id) {
      return NextResponse.json(
        { error: "candidate_id is required" },
        { status: 400 }
      );
    }

    const ticket = await issueTicket({
      orgId,
      candidateId: candidate_id,
      ticketType: ticket_type,
      issuedVia: issued_via,
      expiryDays: expiry_days,
    });

    if (!ticket) {
      return NextResponse.json(
        { error: "Failed to issue ticket" },
        { status: 500 }
      );
    }

    // Optionally send via LINE
    if (send_line) {
      const adminClient = createAdminClient();
      const { data: candidate } = await adminClient
        .from("candidates")
        .select("line_user_id")
        .eq("id", candidate_id)
        .single();

      if (candidate?.line_user_id) {
        await sendTicketViaLine(ticket, candidate.line_user_id);
      }
    }

    return NextResponse.json({ data: ticket }, { status: 201 });
  } catch (error) {
    console.error("Issue ticket error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
