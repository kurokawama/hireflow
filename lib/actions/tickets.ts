"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  issueTicket,
  redeemTicket,
  listTickets,
  getTicketStats,
  getTicketSettings,
  upsertTicketSettings,
  expireOverdueTickets,
  getTicketByCode,
} from "@/lib/tickets/ticket-service";
import { runAutoTicketWorkflow } from "@/lib/tickets/auto-workflow";
import { trackFunnelEvent } from "@/lib/tracking/funnel";
import type {
  ExperienceTicket,
  TicketWithCandidate,
  TicketStats,
  TicketSettings,
  VisitorInfo,
  TicketType,
  TicketIssuedVia,
} from "@/types/tickets";

// ============================================================
// Helper: get current user's org_id
// ============================================================

async function getOrgId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const adminClient = createAdminClient();
  const { data: member } = await adminClient
    .from("organization_members")
    .select("org_id")
    .eq("auth_user_id", user.id)
    .single();

  if (!member) throw new Error("No organization found");
  return member.org_id;
}

// ============================================================
// Issue ticket
// ============================================================

export async function issueTicketAction(params: {
  candidateId: string;
  ticketType?: TicketType;
  issuedVia?: TicketIssuedVia;
  expiryDays?: number;
}): Promise<{ data: ExperienceTicket | null; error: string | null }> {
  try {
    const orgId = await getOrgId();

    const ticket = await issueTicket({
      orgId,
      candidateId: params.candidateId,
      ticketType: params.ticketType,
      issuedVia: params.issuedVia,
      expiryDays: params.expiryDays,
    });

    if (!ticket) {
      return { data: null, error: "Failed to issue ticket" };
    }

    // Track funnel
    await trackFunnelEvent({
      org_id: orgId,
      funnel_step: "ticket_issued",
      entry_source: "direct",
      candidate_id: params.candidateId,
      metadata: { manual: true },
    });

    return { data: ticket, error: null };
  } catch (error) {
    return { data: null, error: String(error) };
  }
}

// ============================================================
// Bulk issue tickets
// ============================================================

export async function bulkIssueTicketsAction(params: {
  candidateIds: string[];
  ticketType?: TicketType;
  issuedVia?: TicketIssuedVia;
  expiryDays?: number;
}): Promise<{ issued: number; failed: number; error: string | null }> {
  try {
    const orgId = await getOrgId();
    let issued = 0;
    let failed = 0;

    for (const candidateId of params.candidateIds) {
      const ticket = await issueTicket({
        orgId,
        candidateId,
        ticketType: params.ticketType,
        issuedVia: params.issuedVia,
        expiryDays: params.expiryDays,
      });

      if (ticket) {
        issued++;
        await trackFunnelEvent({
          org_id: orgId,
          funnel_step: "ticket_issued",
          entry_source: "direct",
          candidate_id: candidateId,
          metadata: { bulk: true },
        });
      } else {
        failed++;
      }
    }

    return { issued, failed, error: null };
  } catch (error) {
    return { issued: 0, failed: params.candidateIds.length, error: String(error) };
  }
}

// ============================================================
// Redeem ticket
// ============================================================

export async function redeemTicketAction(params: {
  ticketCode: string;
  storeId: string;
  visitorInfo: VisitorInfo;
}): Promise<{ data: ExperienceTicket | null; error: string | null }> {
  try {
    const ticket = await redeemTicket(params);

    if (!ticket) {
      return { data: null, error: "Failed to redeem ticket" };
    }

    // Track funnel
    await trackFunnelEvent({
      org_id: ticket.org_id,
      funnel_step: "ticket_redeemed",
      entry_source: "direct",
      candidate_id: ticket.candidate_id,
      metadata: {
        store_id: params.storeId,
        ticket_code: params.ticketCode,
      },
    });

    return { data: ticket, error: null };
  } catch (error) {
    return { data: null, error: String(error) };
  }
}

// ============================================================
// List & stats
// ============================================================

export async function listTicketsAction(options?: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<{
  data: TicketWithCandidate[];
  count: number;
  error: string | null;
}> {
  try {
    const orgId = await getOrgId();
    const result = await listTickets(orgId, options);
    return { data: result.tickets, count: result.count, error: null };
  } catch (error) {
    return { data: [], count: 0, error: String(error) };
  }
}

export async function getTicketStatsAction(): Promise<{
  data: TicketStats | null;
  error: string | null;
}> {
  try {
    const orgId = await getOrgId();
    const stats = await getTicketStats(orgId);
    return { data: stats, error: null };
  } catch (error) {
    return { data: null, error: String(error) };
  }
}

export async function getTicketByCodeAction(
  code: string
): Promise<{ data: TicketWithCandidate | null; error: string | null }> {
  try {
    const ticket = await getTicketByCode(code);
    return { data: ticket, error: null };
  } catch (error) {
    return { data: null, error: String(error) };
  }
}

// ============================================================
// Settings
// ============================================================

export async function getTicketSettingsAction(
  campaignId?: string
): Promise<{ data: TicketSettings | null; error: string | null }> {
  try {
    const orgId = await getOrgId();
    const settings = await getTicketSettings(orgId, campaignId);
    return { data: settings, error: null };
  } catch (error) {
    return { data: null, error: String(error) };
  }
}

export async function saveTicketSettingsAction(
  settings: Partial<TicketSettings>
): Promise<{ data: TicketSettings | null; error: string | null }> {
  try {
    const orgId = await getOrgId();
    const result = await upsertTicketSettings(orgId, settings);
    return { data: result, error: null };
  } catch (error) {
    return { data: null, error: String(error) };
  }
}

// ============================================================
// Expire overdue
// ============================================================

export async function expireOverdueTicketsAction(): Promise<{
  expired: number;
  error: string | null;
}> {
  try {
    const orgId = await getOrgId();
    const expired = await expireOverdueTickets(orgId);
    return { expired, error: null };
  } catch (error) {
    return { expired: 0, error: String(error) };
  }
}

// ============================================================
// Auto workflow trigger
// ============================================================

export async function triggerAutoTicketAction(
  candidateId: string
): Promise<{
  eligible: boolean;
  ticketIssued: boolean;
  lineSent: boolean;
  reason: string;
}> {
  return runAutoTicketWorkflow(candidateId);
}
