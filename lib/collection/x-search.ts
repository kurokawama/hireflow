// X (Twitter) API v2 user search client
// Requires X API Basic ($200/month) or higher for user search

const X_API_BASE = "https://api.twitter.com/2";

interface XUserSearchResult {
  id: string;
  name: string;
  username: string;
  description: string;
  profile_image_url: string | null;
  public_metrics: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
    listed_count: number;
  };
  location: string | null;
  verified: boolean;
  url: string | null;
}

function getBearerToken(): string {
  const token = process.env.X_API_BEARER_TOKEN;
  if (!token) {
    throw new Error("X_API_BEARER_TOKEN is not configured");
  }
  return token;
}

async function xFetch<T>(endpoint: string): Promise<T> {
  const token = getBearerToken();
  const response = await fetch(`${X_API_BASE}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    if (response.status === 429) {
      throw new Error("X API rate limit exceeded. Please try again later.");
    }
    throw new Error(`X API error (${response.status}): ${errorText}`);
  }

  return response.json() as Promise<T>;
}

// Search users by keyword query
export async function searchXUsers(
  query: string,
  maxResults: number = 20
): Promise<XUserSearchResult[]> {
  // X API v2 recent search — find tweets from users matching keywords
  // Then extract unique user profiles
  const searchParams = new URLSearchParams({
    query: `${query} -is:retweet`,
    max_results: String(Math.min(maxResults, 100)),
    "tweet.fields": "author_id",
    "user.fields":
      "name,username,description,profile_image_url,public_metrics,location,verified,url",
    expansions: "author_id",
  });

  const result = await xFetch<{
    data?: Array<{ author_id: string }>;
    includes?: { users?: XUserSearchResult[] };
  }>(`/tweets/search/recent?${searchParams.toString()}`);

  if (!result.includes?.users) {
    return [];
  }

  // Deduplicate by user ID
  const seen = new Set<string>();
  const uniqueUsers: XUserSearchResult[] = [];

  for (const user of result.includes.users) {
    if (!seen.has(user.id)) {
      seen.add(user.id);
      uniqueUsers.push(user);
    }
  }

  return uniqueUsers;
}

// Get user profiles by usernames
export async function getXUsersByUsernames(
  usernames: string[]
): Promise<XUserSearchResult[]> {
  const cleanUsernames = usernames
    .map((u) => u.replace(/^@/, ""))
    .slice(0, 100); // API limit: 100 per request

  const params = new URLSearchParams({
    usernames: cleanUsernames.join(","),
    "user.fields":
      "name,username,description,profile_image_url,public_metrics,location,verified,url",
  });

  const result = await xFetch<{ data?: XUserSearchResult[] }>(
    `/users/by?${params.toString()}`
  );

  return result.data ?? [];
}

// Convert X user to our standard profile format for batch import
export function xUserToProfileData(user: XUserSearchResult) {
  return {
    platform: "x" as const,
    profile_url: `https://x.com/${user.username}`,
    username: user.username,
    display_name: user.name,
    bio: user.description,
    follower_count: user.public_metrics.followers_count,
    source: "x_api" as const,
  };
}

export type { XUserSearchResult };
