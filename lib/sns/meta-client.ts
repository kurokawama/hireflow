// Meta (Facebook + Instagram) Graph API client
// Requires: META_APP_ID, META_APP_SECRET, META_ACCESS_TOKEN
// Facebook Pages + Instagram Content Publishing — requires App Review

import { BaseSNSClient, MockSNSClient, type PostContent, type SNSClientConfig } from "./base-client";
import type { SNSPlatform, SNSPostResult } from "@/types/sns";

const GRAPH_API_VERSION = "v19.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export class MetaClient extends BaseSNSClient {
  private pageId: string;

  constructor(platform: SNSPlatform, config: SNSClientConfig) {
    super(platform, config);
    this.pageId = (config.account_metadata?.page_id as string) || "";
  }

  async post(content: PostContent): Promise<SNSPostResult> {
    if (!process.env.META_APP_ID || !process.env.META_APP_SECRET) {
      console.warn(`[MetaClient] No API keys configured for ${this.platform}, using mock`);
      const mock = new MockSNSClient(this.platform, this.config);
      return mock.post(content);
    }

    if (this.platform === "instagram") {
      return this.postToInstagram(content);
    }
    return this.postToFacebook(content);
  }

  private async postToFacebook(content: PostContent): Promise<SNSPostResult> {
    try {
      // Facebook Pages API: POST /{page-id}/feed
      const response = await fetch(`${GRAPH_API_BASE}/${this.pageId}/feed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content.text,
          link: content.link_url || undefined,
          access_token: this.config.access_token,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: `Facebook API error: ${response.status}`,
          response_data: errorData,
        };
      }

      const data = await response.json();
      return {
        success: true,
        external_post_id: data.id,
        response_data: data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Facebook API request failed",
      };
    }
  }

  private async postToInstagram(content: PostContent): Promise<SNSPostResult> {
    try {
      const igAccountId = (this.config.account_metadata?.ig_business_account_id as string) || this.pageId;

      // Step 1: Create media container
      const containerParams: Record<string, string> = {
        caption: content.text,
        access_token: this.config.access_token,
      };

      if (content.media_urls && content.media_urls.length > 0) {
        containerParams.image_url = content.media_urls[0];
      }

      const containerResponse = await fetch(`${GRAPH_API_BASE}/${igAccountId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(containerParams),
      });

      if (!containerResponse.ok) {
        const errorData = await containerResponse.json().catch(() => ({}));
        return {
          success: false,
          error: `Instagram container error: ${containerResponse.status}`,
          response_data: errorData,
        };
      }

      const containerData = await containerResponse.json();
      const containerId = containerData.id;

      // Step 2: Publish the container
      const publishResponse = await fetch(`${GRAPH_API_BASE}/${igAccountId}/media_publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creation_id: containerId,
          access_token: this.config.access_token,
        }),
      });

      if (!publishResponse.ok) {
        const errorData = await publishResponse.json().catch(() => ({}));
        return {
          success: false,
          error: `Instagram publish error: ${publishResponse.status}`,
          response_data: errorData,
        };
      }

      const publishData = await publishResponse.json();
      return {
        success: true,
        external_post_id: publishData.id,
        response_data: publishData,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Instagram API request failed",
      };
    }
  }

  async verify(): Promise<boolean> {
    if (!process.env.META_APP_ID) return true; // Mock

    try {
      const response = await fetch(
        `${GRAPH_API_BASE}/me?access_token=${this.config.access_token}`
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  async refreshToken(): Promise<{ access_token: string; expires_at?: string } | null> {
    if (!process.env.META_APP_ID || !process.env.META_APP_SECRET) return null;

    try {
      // Exchange for long-lived token
      const params = new URLSearchParams({
        grant_type: "fb_exchange_token",
        client_id: process.env.META_APP_ID,
        client_secret: process.env.META_APP_SECRET,
        fb_exchange_token: this.config.access_token,
      });

      const response = await fetch(`${GRAPH_API_BASE}/oauth/access_token?${params}`);
      if (!response.ok) return null;

      const data = await response.json();
      return {
        access_token: data.access_token,
        expires_at: data.expires_in
          ? new Date(Date.now() + data.expires_in * 1000).toISOString()
          : undefined,
      };
    } catch {
      return null;
    }
  }

  async deletePost(externalPostId: string): Promise<boolean> {
    if (!process.env.META_APP_ID) return true; // Mock

    try {
      const response = await fetch(
        `${GRAPH_API_BASE}/${externalPostId}?access_token=${this.config.access_token}`,
        { method: "DELETE" }
      );
      return response.ok;
    } catch {
      return false;
    }
  }
}
