// YouTube Data API v3 — Channel and video search
// Free tier: 100 search queries / day (10,000 units, search costs 100 units each)

import { createAdminClient } from "@/lib/supabase/admin";
import type { YouTubeSearchResult } from "@/types/targets";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

interface YouTubeSearchResponse {
  items: Array<{
    id: { channelId?: string; videoId?: string };
    snippet: {
      channelId: string;
      channelTitle: string;
      title: string;
      description: string;
      thumbnails: { medium?: { url: string } };
    };
  }>;
  pageInfo: { totalResults: number };
}

interface YouTubeChannelResponse {
  items: Array<{
    id: string;
    statistics: {
      subscriberCount: string;
      videoCount: string;
      viewCount: string;
    };
  }>;
}

// Search YouTube channels by keyword
export async function searchYouTubeChannels(
  query: string,
  orgId: string,
  maxResults: number = 10
): Promise<YouTubeSearchResult[]> {
  if (!YOUTUBE_API_KEY) {
    throw new Error("YOUTUBE_API_KEY is not configured");
  }

  // Check cache first
  const cached = await getCachedResults(query, orgId);
  if (cached) return cached;

  // Search for channels
  const searchUrl = new URL(`${YOUTUBE_API_BASE}/search`);
  searchUrl.searchParams.set("key", YOUTUBE_API_KEY);
  searchUrl.searchParams.set("q", query);
  searchUrl.searchParams.set("type", "channel");
  searchUrl.searchParams.set("part", "snippet");
  searchUrl.searchParams.set("maxResults", String(maxResults));
  searchUrl.searchParams.set("regionCode", "JP");
  searchUrl.searchParams.set("relevanceLanguage", "ja");

  const searchRes = await fetch(searchUrl.toString());
  if (!searchRes.ok) {
    const err = await searchRes.text();
    throw new Error(`YouTube search failed: ${err}`);
  }

  const searchData: YouTubeSearchResponse = await searchRes.json();
  const channelIds = searchData.items
    .map((item) => item.snippet.channelId)
    .filter(Boolean);

  if (channelIds.length === 0) return [];

  // Get channel statistics
  const statsUrl = new URL(`${YOUTUBE_API_BASE}/channels`);
  statsUrl.searchParams.set("key", YOUTUBE_API_KEY);
  statsUrl.searchParams.set("id", channelIds.join(","));
  statsUrl.searchParams.set("part", "statistics");

  const statsRes = await fetch(statsUrl.toString());
  const statsData: YouTubeChannelResponse = statsRes.ok
    ? await statsRes.json()
    : { items: [] };

  const statsMap = new Map(
    statsData.items.map((ch) => [ch.id, ch.statistics])
  );

  // Combine results
  const results: YouTubeSearchResult[] = searchData.items.map((item) => {
    const stats = statsMap.get(item.snippet.channelId);
    return {
      channel_id: item.snippet.channelId,
      channel_title: item.snippet.channelTitle,
      description: item.snippet.description,
      thumbnail_url: item.snippet.thumbnails?.medium?.url || "",
      subscriber_count: stats ? parseInt(stats.subscriberCount, 10) : null,
      video_count: stats ? parseInt(stats.videoCount, 10) : null,
      profile_url: `https://www.youtube.com/channel/${item.snippet.channelId}`,
    };
  });

  // Cache results (24h TTL)
  await cacheResults(query, orgId, results);

  return results;
}

// Cache helpers
async function getCachedResults(
  query: string,
  orgId: string
): Promise<YouTubeSearchResult[] | null> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("youtube_search_cache")
    .select("result_json, expires_at")
    .eq("query", query)
    .eq("org_id", orgId)
    .single();

  if (!data) return null;

  // Check expiry
  if (new Date(data.expires_at) < new Date()) return null;

  return data.result_json as YouTubeSearchResult[];
}

async function cacheResults(
  query: string,
  orgId: string,
  results: YouTubeSearchResult[]
): Promise<void> {
  const supabase = createAdminClient();

  // Upsert: delete old + insert new
  await supabase
    .from("youtube_search_cache")
    .delete()
    .eq("query", query)
    .eq("org_id", orgId);

  await supabase.from("youtube_search_cache").insert({
    org_id: orgId,
    query,
    result_json: results,
    result_count: results.length,
  });
}
