export type GiftType = "amazon" | "line_gift";
export type GiftCodeStatus = "available" | "distributed" | "expired";

export interface GiftCode {
  id: string;
  org_id: string;
  campaign_id: string | null;
  gift_type: GiftType;
  code: string;
  amount_yen: number | null;
  status: GiftCodeStatus;
  imported_at: string;
  created_at: string;
}

export interface GiftDistribution {
  id: string;
  org_id: string;
  gift_code_id: string;
  candidate_id: string;
  campaign_id: string | null;
  distributed_via: "line" | "manual";
  line_sent: boolean;
  distributed_at: string;
}

export interface GiftSettings {
  id: string;
  org_id: string;
  campaign_id: string | null;
  gift_type: GiftType;
  auto_distribute: boolean;
  score_threshold: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GiftCodeStats {
  total: number;
  available: number;
  distributed: number;
  expired: number;
}

export interface GiftDistributionWithDetails extends GiftDistribution {
  gift_code?: GiftCode;
  candidate?: {
    id: string;
    name: string;
    line_user_id: string | null;
  };
}
