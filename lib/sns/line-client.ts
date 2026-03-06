// LINE Messaging API client
// Requires: LINE_CHANNEL_ACCESS_TOKEN, LINE_CHANNEL_SECRET
// Used for broadcast messages and webhook handling

import { BaseSNSClient, MockSNSClient, type PostContent, type SNSClientConfig } from "./base-client";
import type { SNSPostResult } from "@/types/sns";

const LINE_API_BASE = "https://api.line.me/v2";

export class LINEClient extends BaseSNSClient {
  constructor(config: SNSClientConfig) {
    super("line", config);
  }

  async post(content: PostContent): Promise<SNSPostResult> {
    const channelToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

    if (!channelToken) {
      console.warn("[LINEClient] No channel access token, using mock");
      const mock = new MockSNSClient("line", this.config);
      return mock.post(content);
    }

    try {
      // LINE Messaging API: Broadcast message to all followers
      const messages: Array<Record<string, unknown>> = [
        {
          type: "text",
          text: content.text,
        },
      ];

      // Add image message if media_urls provided
      if (content.media_urls && content.media_urls.length > 0) {
        messages.push({
          type: "image",
          originalContentUrl: content.media_urls[0],
          previewImageUrl: content.media_urls[0],
        });
      }

      const response = await fetch(`${LINE_API_BASE}/bot/message/broadcast`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${channelToken}`,
        },
        body: JSON.stringify({ messages }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: `LINE API error: ${response.status}`,
          response_data: errorData,
        };
      }

      // LINE broadcast doesn't return a post ID, generate a tracking ID
      const trackingId = `line_broadcast_${Date.now()}`;
      return {
        success: true,
        external_post_id: trackingId,
        response_data: { broadcast: true, message_count: messages.length },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "LINE API request failed",
      };
    }
  }

  async verify(): Promise<boolean> {
    const channelToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    if (!channelToken) return true; // Mock

    try {
      const response = await fetch(`${LINE_API_BASE}/bot/info`, {
        headers: { Authorization: `Bearer ${channelToken}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async refreshToken(): Promise<{ access_token: string; expires_at?: string } | null> {
    // LINE channel access tokens are long-lived and managed via LINE Developer Console
    // No programmatic refresh needed for Channel Access Token v2.1
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async deletePost(_externalPostId: string): Promise<boolean> {
    // LINE broadcasts cannot be deleted
    return false;
  }
}

// Helper: Verify LINE webhook signature
export async function verifyLineSignature(body: string, signature: string): Promise<boolean> {
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  if (!channelSecret) return false;

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(channelSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signatureBytes = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(body)
    );
    const hash = Buffer.from(signatureBytes).toString("base64");
    return hash === signature;
  } catch {
    return false;
  }
}
