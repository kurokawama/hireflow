import { NextRequest, NextResponse } from "next/server";
import { getTicketByCode } from "@/lib/tickets/ticket-service";
import { redeemTicket } from "@/lib/tickets/ticket-service";
import { trackFunnelEvent } from "@/lib/tracking/funnel";
import type { VisitorInfo } from "@/types/tickets";

// GET /api/verify/[code] — Public ticket verification
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const ticket = await getTicketByCode(code);

    if (!ticket) {
      return NextResponse.json(
        { error: "チケットが見つかりません" },
        { status: 404 }
      );
    }

    // Check expiry
    const isExpired = new Date(ticket.expires_at) < new Date();

    return NextResponse.json({
      data: {
        ticket_code: ticket.ticket_code,
        ticket_type: ticket.ticket_type,
        status: isExpired && ticket.status === "issued" ? "expired" : ticket.status,
        issued_at: ticket.issued_at,
        expires_at: ticket.expires_at,
        redeemed_at: ticket.redeemed_at,
        candidate: ticket.candidates
          ? {
              name: ticket.candidates.name,
              score: ticket.candidates.ai_score,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Verify ticket error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/verify/[code] — Redeem ticket (store staff action)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const body: { store_id: string; visitor_info: VisitorInfo } =
      await request.json();

    if (!body.store_id) {
      return NextResponse.json(
        { error: "store_id is required" },
        { status: 400 }
      );
    }

    const ticket = await redeemTicket({
      ticketCode: code,
      storeId: body.store_id,
      visitorInfo: body.visitor_info || {},
    });

    if (!ticket) {
      return NextResponse.json(
        { error: "チケットの使用に失敗しました。期限切れまたは使用済みの可能性があります。" },
        { status: 400 }
      );
    }

    // Track funnel event
    await trackFunnelEvent({
      org_id: ticket.org_id,
      funnel_step: "ticket_redeemed",
      entry_source: "direct",
      candidate_id: ticket.candidate_id,
      metadata: {
        store_id: body.store_id,
        ticket_code: code,
      },
    });

    return NextResponse.json({ data: ticket });
  } catch (error) {
    console.error("Redeem ticket error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
