// OAuth 2.0 handler for SNS platform connections
import type { SNSPlatform, OAuthConfig } from "@/types/sns";

// OAuth configurations per platform
function getOAuthConfig(platform: SNSPlatform): OAuthConfig | null {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
  const redirectUri = `${baseUrl}/api/sns/callback/${platform}`;

  switch (platform) {
    case "x":
      if (!process.env.X_API_KEY || !process.env.X_API_SECRET) return null;
      return {
        platform: "x",
        client_id: process.env.X_API_KEY,
        client_secret: process.env.X_API_SECRET,
        authorize_url: "https://twitter.com/i/oauth2/authorize",
        token_url: "https://api.twitter.com/2/oauth2/token",
        scopes: ["tweet.read", "tweet.write", "users.read", "offline.access"],
        redirect_uri: redirectUri,
      };

    case "facebook":
    case "instagram":
      if (!process.env.META_APP_ID || !process.env.META_APP_SECRET) return null;
      return {
        platform,
        client_id: process.env.META_APP_ID,
        client_secret: process.env.META_APP_SECRET,
        authorize_url: "https://www.facebook.com/v19.0/dialog/oauth",
        token_url: "https://graph.facebook.com/v19.0/oauth/access_token",
        scopes:
          platform === "instagram"
            ? ["instagram_basic", "instagram_content_publish", "pages_show_list"]
            : ["pages_manage_posts", "pages_read_engagement", "pages_show_list"],
        redirect_uri: redirectUri,
      };

    case "line":
      // LINE uses Channel Access Token from Developer Console — no user OAuth needed
      return null;

    default:
      return null;
  }
}

// Generate OAuth authorization URL
export function generateAuthUrl(
  platform: SNSPlatform,
  state: string
): { url: string; config: OAuthConfig } | null {
  const config = getOAuthConfig(platform);
  if (!config) return null;

  const params = new URLSearchParams({
    client_id: config.client_id,
    redirect_uri: config.redirect_uri,
    response_type: "code",
    scope: config.scopes.join(" "),
    state,
  });

  // Platform-specific additions
  if (platform === "x") {
    params.set("code_challenge", "challenge"); // PKCE simplified
    params.set("code_challenge_method", "plain");
  }

  return {
    url: `${config.authorize_url}?${params.toString()}`,
    config,
  };
}

// Exchange authorization code for access token
export async function exchangeCodeForToken(
  platform: SNSPlatform,
  code: string
): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  account_id?: string;
  account_name?: string;
  metadata?: Record<string, unknown>;
} | null> {
  const config = getOAuthConfig(platform);
  if (!config) return null;

  try {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: config.redirect_uri,
      client_id: config.client_id,
      client_secret: config.client_secret,
    });

    // X requires PKCE code_verifier
    if (platform === "x") {
      body.set("code_verifier", "challenge");
    }

    const response = await fetch(config.token_url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!response.ok) {
      console.error(`OAuth token exchange failed for ${platform}:`, await response.text());
      return null;
    }

    const data = await response.json();

    // Get account info based on platform
    const accountInfo = await getAccountInfo(platform, data.access_token);

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
      ...accountInfo,
    };
  } catch (error) {
    console.error(`OAuth exchange error for ${platform}:`, error);
    return null;
  }
}

// Get account info after OAuth
async function getAccountInfo(
  platform: SNSPlatform,
  accessToken: string
): Promise<{
  account_id?: string;
  account_name?: string;
  metadata?: Record<string, unknown>;
}> {
  try {
    switch (platform) {
      case "x": {
        const res = await fetch("https://api.twitter.com/2/users/me", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          return {
            account_id: data.data?.id,
            account_name: `@${data.data?.username}`,
            metadata: { username: data.data?.username },
          };
        }
        break;
      }

      case "facebook":
      case "instagram": {
        // Get page list
        const pagesRes = await fetch(
          `https://graph.facebook.com/v19.0/me/accounts?access_token=${accessToken}`
        );
        if (pagesRes.ok) {
          const pagesData = await pagesRes.json();
          const firstPage = pagesData.data?.[0];
          if (firstPage) {
            return {
              account_id: firstPage.id,
              account_name: firstPage.name,
              metadata: {
                page_id: firstPage.id,
                page_access_token: firstPage.access_token,
              },
            };
          }
        }
        break;
      }
    }
  } catch (error) {
    console.error(`Error getting account info for ${platform}:`, error);
  }

  return {};
}

// Check if a platform has OAuth configured
export function isOAuthConfigured(platform: SNSPlatform): boolean {
  return getOAuthConfig(platform) !== null;
}
