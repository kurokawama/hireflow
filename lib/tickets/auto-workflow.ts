// Automated ticket workflow — quiz complete → score check → ticket issue → LINE send
import { createAdminClient } from "@/lib/supabase/admin";
import { getTicketSettings } from "./ticket-service";
import { issueTicket, sendTicketViaLine } from "./ticket-service";
import { trackFunnelEvent } from "@/lib/tracking/funnel";

interface AutoTicketResult {
  eligible: boolean;
  ticketIssued: boolean;
  lineSent: boolean;
  reason: string;
}

/**
 * Run the automated ticket workflow for a candidate.
 * Called after quiz submission + scoring.
 *
 * Flow:
 * 1. Check if auto-issue is enabled
 * 2. Check if candidate score meets threshold
 * 3. Issue ticket (generate QR code)
 * 4. Send ticket via LINE (if line_user_id available)
 * 5. Track funnel events
 */
export async function runAutoTicketWorkflow(
  candidateId: string
): Promise<AutoTicketResult> {
  const supabase = createAdminClient();

  // 1. Get candidate info
  const { data: candidate, error: candidateErr } = await supabase
    .from("candidates")
    .select("*")
    .eq("id", candidateId)
    .single();

  if (candidateErr || !candidate) {
    return {
      eligible: false,
      ticketIssued: false,
      lineSent: false,
      reason: "Candidate not found",
    };
  }

  // Skip if ticket already issued
  if (candidate.ticket_issued_at) {
    return {
      eligible: false,
      ticketIssued: false,
      lineSent: false,
      reason: "Ticket already issued",
    };
  }

  // 2. Get ticket settings (campaign-specific or org-level)
  const settings = await getTicketSettings(
    candidate.org_id,
    candidate.campaign_id || undefined
  );

  // Fall back to org-level settings if campaign-specific not found
  const effectiveSettings =
    settings || (await getTicketSettings(candidate.org_id));

  if (!effectiveSettings || !effectiveSettings.is_active) {
    return {
      eligible: false,
      ticketIssued: false,
      lineSent: false,
      reason: "Auto-issue not configured or disabled",
    };
  }

  if (!effectiveSettings.auto_issue) {
    return {
      eligible: false,
      ticketIssued: false,
      lineSent: false,
      reason: "Auto-issue disabled",
    };
  }

  // 3. Check score threshold
  if (candidate.ai_score < effectiveSettings.score_threshold) {
    return {
      eligible: false,
      ticketIssued: false,
      lineSent: false,
      reason: `Score ${candidate.ai_score} below threshold ${effectiveSettings.score_threshold}`,
    };
  }

  // 4. Issue ticket
  const ticket = await issueTicket({
    orgId: candidate.org_id,
    candidateId: candidate.id,
    ticketType: effectiveSettings.ticket_type,
    issuedVia: "line",
    expiryDays: effectiveSettings.expiry_days,
  });

  if (!ticket) {
    return {
      eligible: true,
      ticketIssued: false,
      lineSent: false,
      reason: "Failed to issue ticket",
    };
  }

  // Track funnel event
  await trackFunnelEvent({
    org_id: candidate.org_id,
    funnel_step: "ticket_issued",
    entry_source: candidate.source_channel || "direct",
    candidate_id: candidate.id,
    metadata: {
      ticket_code: ticket.ticket_code,
      ai_score: candidate.ai_score,
      threshold: effectiveSettings.score_threshold,
    },
  });

  // 5. Send via LINE if possible
  let lineSent = false;
  if (candidate.line_user_id) {
    lineSent = await sendTicketViaLine(
      ticket,
      candidate.line_user_id,
      effectiveSettings.line_message
    );
  }

  return {
    eligible: true,
    ticketIssued: true,
    lineSent,
    reason: lineSent
      ? "Ticket issued and sent via LINE"
      : "Ticket issued (LINE user not available or send failed)",
  };
}
