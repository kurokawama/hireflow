// Employee Advocacy types — Staff SNS amplification system

export type KitStatus = "draft" | "scheduled" | "distributed" | "archived";

// ============================================================
// Staff SNS Accounts
// ============================================================

export interface StaffSnsAccount {
  id: string;
  org_id: string;
  user_id: string; // auth.users reference
  platform: "instagram" | "x" | "tiktok" | "facebook";
  username: string;
  follower_count: number | null;
  is_champion: boolean; // SNS Champion per store
  store_id: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Posting Kits (きっかけキット)
// ============================================================

export interface PostingKit {
  id: string;
  org_id: string;
  title: string; // e.g. "今週のテーマ: 朝の準備ルーティン"
  theme: string; // Weekly theme description
  hints: KitHint[]; // Shooting/posting hints
  hashtags: string[]; // Recommended hashtags
  template_text: string | null; // Optional copy-paste text
  media_urls: string[]; // Optional pre-made assets (logo frames, etc.)
  target_list_id: string | null; // Which target audience this kit relates to
  brand: string | null; // "dr_stretch" | "wecle" | null
  scheduled_at: string | null; // When to distribute
  distributed_at: string | null;
  status: KitStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface KitHint {
  hint_text: string; // e.g. "出勤前のストレッチ風景を撮影"
  example_description: string | null; // Description of example content
}

// ============================================================
// Staff Share Tracking
// ============================================================

export interface StaffShare {
  id: string;
  org_id: string;
  kit_id: string;
  user_id: string; // auth.users reference
  platform: "instagram" | "x" | "tiktok" | "facebook";
  post_url: string | null; // Optional: URL of the shared post
  shared_at: string;
  created_at: string;
}

// ============================================================
// Leaderboard
// ============================================================

export interface ShareLeaderboardEntry {
  user_id: string;
  display_name: string;
  store_name: string;
  share_count: number;
  platforms_used: string[];
  is_champion: boolean;
}

export interface StoreLeaderboardEntry {
  store_id: string;
  store_name: string;
  brand: string;
  total_shares: number;
  active_staff_count: number;
  champion_name: string | null;
}

// ============================================================
// DTOs
// ============================================================

export interface CreatePostingKitRequest {
  title: string;
  theme: string;
  hints: KitHint[];
  hashtags: string[];
  template_text?: string;
  media_urls?: string[];
  target_list_id?: string;
  brand?: string;
  scheduled_at?: string;
}

export interface RegisterStaffSnsRequest {
  platform: "instagram" | "x" | "tiktok" | "facebook";
  username: string;
  follower_count?: number;
  is_champion?: boolean;
}

export interface RecordShareRequest {
  kit_id: string;
  platform: "instagram" | "x" | "tiktok" | "facebook";
  post_url?: string;
}
