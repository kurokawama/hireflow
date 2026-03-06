// X (Twitter) API v2 client
// Requires: X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET
// Free tier: 500 posts/month, no approval needed

import { BaseSNSClient, MockSNSClient, type PostContent, type SNSClientConfig } from "./base-client";
import type { SNSPostResult } from "@/types/sns";

export class XClient extends BaseSNSClient {
  constructor(config: SNSClientConfig) {
    super("x", config);
  }

  async post(content: PostContent): Promise<SNSPostResult> {
    const apiKey = process.env.X_API_KEY;
    const apiSecret = process.env.X_API_SECRET;

    if (!apiKey || !apiSecret) {
      // Fall back to mock
      console.warn("[XClient] No API keys configured, using mock");
      const mock = new MockSNSClient("x", this.config);
      return mock.post(content);
    }

    try {
      // X API v2 tweet creation
      // POST https://api.twitter.com/2/tweets
      const response = await fetch("https://api.twitter.com/2/tweets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.access_token}`,
        },
        body: JSON.stringify({
          text: content.text.substring(0, 280), // X character limit
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: `X API error: ${response.status} ${response.statusText}`,
          response_data: errorData,
        };
      }

      const data = await response.json();
      return {
        success: true,
        external_post_id: data.data?.id,
        response_data: data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "X API request failed",
      };
    }
  }

  async verify(): Promise<boolean> {
    if (!process.env.X_API_KEY) return true; // Mock always valid

    try {
      const response = await fetch("https://api.twitter.com/2/users/me", {
        headers: {
          Authorization: `Bearer ${this.config.access_token}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async refreshToken(): Promise<{ access_token: string; expires_at?: string } | null> {
    // X OAuth 2.0 token refresh
    if (!process.env.X_API_KEY || !this.config.refresh_token) return null;

    try {
      const response = await fetch("https://api.twitter.com/2/oauth2/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(`${process.env.X_API_KEY}:${process.env.X_API_SECRET}`).toString("base64")}`,
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: this.config.refresh_token,
        }),
      });

      if (!response.ok) return null;

      const data = await response.json();
      return {
        access_token: data.access_token,
        expires_at: new Date(Date.now() + (data.expires_in || 7200) * 1000).toISOString(),
      };
    } catch {
      return null;
    }
  }

  async deletePost(externalPostId: string): Promise<boolean> {
    if (!process.env.X_API_KEY) return true; // Mock

    try {
      const response = await fetch(`https://api.twitter.com/2/tweets/${externalPostId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${this.config.access_token}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
