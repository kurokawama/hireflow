// Core ticket service — issue, redeem, query, stats
import { createAdminClient } from "@/lib/supabase/admin";
import { generateTicketCode, generateAndStoreQRCode } from "./qr-generator";
import type {
  ExperienceTicket,
  TicketSettings,
  TicketStats,
  TicketWithCandidate,
  TicketType,
  TicketIssuedVia,
  VisitorInfo,
} from "@/types/tickets";

// ============================================================
// Issue a ticket
// ============================================================

export async function issueTicket(params: {
  orgId: string;
  candidateId: string;
  ticketType?: TicketType;
  issuedVia?: TicketIssuedVia;
  expiryDays?: number;
}): Promise<ExperienceTicket | null> {
  const supabase = createAdminClient();
  const ticketCode = generateTicketCode();
  const expiryDays = params.expiryDays || 30;

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiryDays);

  // Generate QR code
  const qrCodeUrl = await generateAndStoreQRCode(ticketCode, params.orgId);

  const { data, error } = await supabase
    .from("experience_tickets")
    .insert({
      org_id: params.orgId,
      candidate_id: params.candidateId,
      ticket_type: params.ticketType || "dr_stretch_60min",
      ticket_code: ticketCode,
      qr_code_url: qrCodeUrl,
      status: "issued",
      issued_via: params.issuedVia || "line",
      issued_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("Issue ticket error:", error);
    return null;
  }

  // Update candidate
  await supabase
    .from("candidates")
    .update({
      ticket_issued_at: new Date().toISOString(),
      stage: "ticket_issued",
    })
    .eq("id", params.candidateId);

  return data as ExperienceTicket;
}

// ============================================================
// Send ticket via LINE
// ============================================================

export async function sendTicketViaLine(
  ticket: ExperienceTicket,
  lineUserId: string,
  message?: string
): Promise<boolean> {
  // LINE Messaging API — push message with QR code image
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!channelAccessToken) {
    console.warn("LINE_CHANNEL_ACCESS_TOKEN not set — skipping LINE send");
    return false;
  }

  const lineMessage = message || "おめでとうございます！条件を満たした方に特別体験チケットをお送りします。";

  try {
    const messages: Array<Record<string, unknown>> = [
      { type: "text", text: lineMessage },
    ];

    // Add QR code image if available
    if (ticket.qr_code_url) {
      messages.push({
        type: "image",
        originalContentUrl: ticket.qr_code_url,
        previewImageUrl: ticket.qr_code_url,
      });
    }

    // Add ticket code as text
    messages.push({
      type: "text",
      text: `チケットコード: ${ticket.ticket_code}\n有効期限: ${new Intl.DateTimeFormat("ja-JP").format(new Date(ticket.expires_at))}`,
    });

    const response = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${channelAccessToken}`,
      },
      body: JSON.stringify({
        to: lineUserId,
        messages,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("LINE push message error:", errorBody);
      return false;
    }

    return true;
  } catch (error) {
    console.error("LINE send error:", error);
    return false;
  }
}

// ============================================================
// Redeem a ticket
// ============================================================

export async function redeemTicket(params: {
  ticketCode: string;
  storeId: string;
  visitorInfo: VisitorInfo;
}): Promise<ExperienceTicket | null> {
  const supabase = createAdminClient();

  // Get the ticket
  const { data: ticket, error: fetchError } = await supabase
    .from("experience_tickets")
    .select("*")
    .eq("ticket_code", params.ticketCode)
    .single();

  if (fetchError || !ticket) {
    console.error("Ticket not found:", params.ticketCode);
    return null;
  }

  // Validate status
  if (ticket.status !== "issued") {
    console.error("Ticket not in issued state:", ticket.status);
    return null;
  }

  // Check expiry
  if (new Date(ticket.expires_at) < new Date()) {
    // Auto-expire
    await supabase
      .from("experience_tickets")
      .update({ status: "expired" })
      .eq("id", ticket.id);
    return null;
  }

  // Redeem
  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await supabase
    .from("experience_tickets")
    .update({
      status: "redeemed",
      redeemed_at: now,
      redeemed_store_id: params.storeId,
      visitor_info: params.visitorInfo,
    })
    .eq("id", ticket.id)
    .select()
    .single();

  if (updateError) {
    console.error("Redeem ticket error:", updateError);
    return null;
  }

  // Update candidate
  await supabase
    .from("candidates")
    .update({
      ticket_redeemed_at: now,
      stage: "ticket_redeemed",
      name: params.visitorInfo.name || null,
      email: params.visitorInfo.email || null,
      phone: params.visitorInfo.phone || null,
    })
    .eq("id", ticket.candidate_id);

  return updated as ExperienceTicket;
}

// ============================================================
// Query tickets
// ============================================================

export async function getTicketByCode(
  ticketCode: string
): Promise<TicketWithCandidate | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("experience_tickets")
    .select(
      `*, candidates(id, name, email, phone, line_user_id, ai_score, stage)`
    )
    .eq("ticket_code", ticketCode)
    .single();

  if (error || !data) return null;
  return data as TicketWithCandidate;
}

export async function listTickets(
  orgId: string,
  options?: {
    status?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{ tickets: TicketWithCandidate[]; count: number }> {
  const supabase = createAdminClient();
  const limit = options?.limit || 50;
  const offset = options?.offset || 0;

  let query = supabase
    .from("experience_tickets")
    .select(
      `*, candidates(id, name, email, phone, line_user_id, ai_score, stage)`,
      { count: "exact" }
    )
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (options?.status) {
    query = query.eq("status", options.status);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("List tickets error:", error);
    return { tickets: [], count: 0 };
  }

  return {
    tickets: (data || []) as TicketWithCandidate[],
    count: count || 0,
  };
}

// ============================================================
// Statistics
// ============================================================

export async function getTicketStats(orgId: string): Promise<TicketStats> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("experience_tickets")
    .select("status")
    .eq("org_id", orgId);

  if (error || !data) {
    return {
      total: 0,
      issued: 0,
      redeemed: 0,
      expired: 0,
      cancelled: 0,
      redemption_rate: 0,
    };
  }

  const stats: TicketStats = {
    total: data.length,
    issued: 0,
    redeemed: 0,
    expired: 0,
    cancelled: 0,
    redemption_rate: 0,
  };

  for (const item of data) {
    const status = item.status as keyof Omit<
      TicketStats,
      "total" | "redemption_rate"
    >;
    if (status in stats) {
      stats[status]++;
    }
  }

  const denominator = stats.issued + stats.redeemed;
  stats.redemption_rate =
    denominator > 0
      ? Math.round((stats.redeemed / denominator) * 10000) / 100
      : 0;

  return stats;
}

// ============================================================
// Expire overdue tickets
// ============================================================

export async function expireOverdueTickets(orgId: string): Promise<number> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("experience_tickets")
    .update({ status: "expired" })
    .eq("org_id", orgId)
    .eq("status", "issued")
    .lt("expires_at", new Date().toISOString())
    .select("id");

  if (error) {
    console.error("Expire overdue tickets error:", error);
    return 0;
  }

  return data?.length || 0;
}

// ============================================================
// Ticket Settings
// ============================================================

export async function getTicketSettings(
  orgId: string,
  campaignId?: string
): Promise<TicketSettings | null> {
  const supabase = createAdminClient();

  let query = supabase
    .from("ticket_settings")
    .select("*")
    .eq("org_id", orgId)
    .eq("is_active", true);

  if (campaignId) {
    query = query.eq("campaign_id", campaignId);
  } else {
    query = query.is("campaign_id", null);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error("Get ticket settings error:", error);
    return null;
  }

  return data as TicketSettings | null;
}

export async function upsertTicketSettings(
  orgId: string,
  settings: Partial<TicketSettings>
): Promise<TicketSettings | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("ticket_settings")
    .upsert(
      {
        org_id: orgId,
        campaign_id: settings.campaign_id || null,
        score_threshold: settings.score_threshold ?? 70,
        ticket_type: settings.ticket_type || "dr_stretch_60min",
        expiry_days: settings.expiry_days ?? 30,
        auto_issue: settings.auto_issue ?? true,
        line_message:
          settings.line_message ||
          "おめでとうございます！条件を満たした方に特別体験チケットをお送りします。",
        is_active: settings.is_active ?? true,
      },
      { onConflict: "org_id,campaign_id" }
    )
    .select()
    .single();

  if (error) {
    console.error("Upsert ticket settings error:", error);
    return null;
  }

  return data as TicketSettings;
}
