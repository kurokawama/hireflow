// Experience ticket types — matches Supabase schema

export type TicketStatus = "issued" | "redeemed" | "expired" | "cancelled";

export type TicketType = "dr_stretch_60min" | "pilates_weekly";

export type TicketIssuedVia = "line" | "email" | "manual";

// ============================================================
// Visitor Info (collected at redemption)
// ============================================================

export interface VisitorInfo {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

// ============================================================
// Experience Ticket
// ============================================================

export interface ExperienceTicket {
  id: string;
  org_id: string;
  candidate_id: string;
  ticket_type: TicketType;
  ticket_code: string;
  qr_code_url: string | null;
  status: TicketStatus;
  issued_via: TicketIssuedVia;
  issued_at: string;
  redeemed_at: string | null;
  expires_at: string;
  redeemed_store_id: string | null;
  visitor_info: VisitorInfo;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Ticket Settings (per-campaign or per-org)
// ============================================================

export interface TicketSettings {
  id: string;
  org_id: string;
  campaign_id: string | null;
  score_threshold: number;
  ticket_type: TicketType;
  expiry_days: number;
  auto_issue: boolean;
  line_message: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Joined types
// ============================================================

export interface TicketWithCandidate extends ExperienceTicket {
  candidates: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    line_user_id: string | null;
    ai_score: number;
    stage: string;
  } | null;
}

// ============================================================
// Statistics
// ============================================================

export interface TicketStats {
  total: number;
  issued: number;
  redeemed: number;
  expired: number;
  cancelled: number;
  redemption_rate: number; // redeemed / (issued + redeemed) %
}

// ============================================================
// DTOs
// ============================================================

export interface CreateTicketRequest {
  candidate_id: string;
  ticket_type?: TicketType;
  issued_via?: TicketIssuedVia;
  expiry_days?: number;
}

export interface RedeemTicketRequest {
  ticket_code: string;
  store_id: string;
  visitor_info: VisitorInfo;
}

export interface BulkIssueRequest {
  candidate_ids: string[];
  ticket_type?: TicketType;
  issued_via?: TicketIssuedVia;
  expiry_days?: number;
}
