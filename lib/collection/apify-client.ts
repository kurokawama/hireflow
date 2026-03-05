// Apify client for Instagram/TikTok profile scraping
// Uses Apify API to run pre-built Actors for SNS data collection

const APIFY_BASE_URL = "https://api.apify.com/v2";

interface ApifyRunInput {
  actorId: string;
  input: Record<string, unknown>;
}

interface ApifyScrapedProfile {
  username: string;
  display_name: string;
  bio: string;
  follower_count: number;
  following_count: number;
  post_count: number;
  profile_url: string;
  profile_pic_url: string | null;
  is_verified: boolean;
  platform: "instagram" | "tiktok";
}

// Actor IDs for Apify marketplace
const ACTORS = {
  instagram_profile: "apify/instagram-scraper",
  instagram_hashtag: "apify/instagram-hashtag-scraper",
  tiktok_profile: "clockworks/free-tiktok-scraper",
  tiktok_hashtag: "clockworks/tiktok-scraper",
} as const;

function getApiToken(): string {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) {
    throw new Error("APIFY_API_TOKEN is not configured");
  }
  return token;
}

async function runActor(config: ApifyRunInput): Promise<unknown[]> {
  const token = getApiToken();

  // Start actor run
  const runResponse = await fetch(
    `${APIFY_BASE_URL}/acts/${config.actorId}/runs?token=${token}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config.input),
    }
  );

  if (!runResponse.ok) {
    const error = await runResponse.text();
    throw new Error(`Apify actor start failed: ${error}`);
  }

  const runData = (await runResponse.json()) as { data: { id: string } };
  const runId = runData.data.id;

  // Poll for completion (max 5 minutes)
  const maxWaitMs = 300_000;
  const pollIntervalMs = 5_000;
  let elapsed = 0;

  while (elapsed < maxWaitMs) {
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    elapsed += pollIntervalMs;

    const statusResponse = await fetch(
      `${APIFY_BASE_URL}/actor-runs/${runId}?token=${token}`
    );
    const statusData = (await statusResponse.json()) as {
      data: { status: string };
    };

    if (statusData.data.status === "SUCCEEDED") {
      // Fetch results from dataset
      const datasetResponse = await fetch(
        `${APIFY_BASE_URL}/actor-runs/${runId}/dataset/items?token=${token}`
      );
      return (await datasetResponse.json()) as unknown[];
    }

    if (
      statusData.data.status === "FAILED" ||
      statusData.data.status === "ABORTED"
    ) {
      throw new Error(`Apify actor run ${statusData.data.status}`);
    }
  }

  throw new Error("Apify actor run timed out");
}

// Normalize Apify results to our standard profile format
function normalizeInstagramProfile(raw: Record<string, unknown>): ApifyScrapedProfile {
  return {
    username: String(raw.username ?? ""),
    display_name: String(raw.fullName ?? raw.username ?? ""),
    bio: String(raw.biography ?? ""),
    follower_count: Number(raw.followersCount ?? 0),
    following_count: Number(raw.followsCount ?? 0),
    post_count: Number(raw.postsCount ?? 0),
    profile_url: `https://www.instagram.com/${raw.username}/`,
    profile_pic_url: raw.profilePicUrl ? String(raw.profilePicUrl) : null,
    is_verified: Boolean(raw.verified),
    platform: "instagram",
  };
}

function normalizeTikTokProfile(raw: Record<string, unknown>): ApifyScrapedProfile {
  const authorMeta = (raw.authorMeta ?? raw) as Record<string, unknown>;
  return {
    username: String(authorMeta.name ?? authorMeta.uniqueId ?? ""),
    display_name: String(authorMeta.nickName ?? authorMeta.name ?? ""),
    bio: String(authorMeta.signature ?? ""),
    follower_count: Number(authorMeta.fans ?? authorMeta.followerCount ?? 0),
    following_count: Number(authorMeta.following ?? authorMeta.followingCount ?? 0),
    post_count: Number(authorMeta.video ?? authorMeta.videoCount ?? 0),
    profile_url: `https://www.tiktok.com/@${authorMeta.name ?? authorMeta.uniqueId}`,
    profile_pic_url: authorMeta.avatar ? String(authorMeta.avatar) : null,
    is_verified: Boolean(authorMeta.verified),
    platform: "tiktok",
  };
}

// ============================================================
// Public API
// ============================================================

export async function searchInstagramByHashtags(
  hashtags: string[],
  maxResults: number = 50
): Promise<ApifyScrapedProfile[]> {
  const results = await runActor({
    actorId: ACTORS.instagram_hashtag,
    input: {
      hashtags: hashtags.map((h) => h.replace(/^#/, "")),
      resultsLimit: maxResults,
      resultsType: "posts",
    },
  });

  // Extract unique profile usernames from posts
  const seen = new Set<string>();
  const profiles: ApifyScrapedProfile[] = [];

  for (const item of results) {
    const raw = item as Record<string, unknown>;
    const username = String(raw.ownerUsername ?? "");
    if (username && !seen.has(username)) {
      seen.add(username);
      profiles.push({
        username,
        display_name: String(raw.ownerFullName ?? username),
        bio: "", // Not available from hashtag search
        follower_count: 0, // Not available from hashtag search
        following_count: 0,
        post_count: 0,
        profile_url: `https://www.instagram.com/${username}/`,
        profile_pic_url: null,
        is_verified: false,
        platform: "instagram",
      });
    }
  }

  return profiles;
}

export async function searchInstagramProfiles(
  usernames: string[]
): Promise<ApifyScrapedProfile[]> {
  const results = await runActor({
    actorId: ACTORS.instagram_profile,
    input: {
      directUrls: usernames.map(
        (u) => `https://www.instagram.com/${u.replace(/^@/, "")}/`
      ),
      resultsType: "details",
      resultsLimit: usernames.length,
    },
  });

  return results.map((item) =>
    normalizeInstagramProfile(item as Record<string, unknown>)
  );
}

export async function searchTikTokByHashtags(
  hashtags: string[],
  maxResults: number = 50
): Promise<ApifyScrapedProfile[]> {
  const results = await runActor({
    actorId: ACTORS.tiktok_hashtag,
    input: {
      hashtags: hashtags.map((h) => h.replace(/^#/, "")),
      resultsPerPage: maxResults,
    },
  });

  // Extract unique profiles from videos
  const seen = new Set<string>();
  const profiles: ApifyScrapedProfile[] = [];

  for (const item of results) {
    const raw = item as Record<string, unknown>;
    const profile = normalizeTikTokProfile(raw);
    if (profile.username && !seen.has(profile.username)) {
      seen.add(profile.username);
      profiles.push(profile);
    }
  }

  return profiles;
}

export type { ApifyScrapedProfile };
