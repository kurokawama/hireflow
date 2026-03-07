// Base SNS client interface and mock implementation
import type { SNSPlatform, SNSPostResult } from "@/types/sns";

export interface SNSClientConfig {
  access_token: string;
  refresh_token?: string | null;
  account_metadata?: Record<string, unknown>;
}

export interface PostContent {
  text: string;
  media_urls?: string[];
  link_url?: string;
}

// Abstract base class for all SNS clients
export abstract class BaseSNSClient {
  protected config: SNSClientConfig;
  protected platform: SNSPlatform;

  constructor(platform: SNSPlatform, config: SNSClientConfig) {
    this.platform = platform;
    this.config = config;
  }

  // Post content to the platform
  abstract post(content: PostContent): Promise<SNSPostResult>;

  // Verify the connection/token is still valid
  abstract verify(): Promise<boolean>;

  // Refresh the access token if expired
  abstract refreshToken(): Promise<{ access_token: string; expires_at?: string } | null>;

  // Delete a post by its external ID
  abstract deletePost(externalPostId: string): Promise<boolean>;
}

// Mock client for platforms without API keys yet
export class MockSNSClient extends BaseSNSClient {
  constructor(platform: SNSPlatform, config: SNSClientConfig) {
    super(platform, config);
  }

  async post(content: PostContent): Promise<SNSPostResult> {
    // Simulate a successful post with a mock ID
    const mockId = `mock_${this.platform}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    return {
      success: true,
      external_post_id: mockId,
      response_data: {
        mock: true,
        platform: this.platform,
        posted_text_length: content.text.length,
        media_urls: content.media_urls || [],
      },
    };
  }

  async verify(): Promise<boolean> {
    // Mock connections are always "valid"
    return true;
  }

  async refreshToken(): Promise<{ access_token: string; expires_at?: string } | null> {
    // Mock tokens never expire
    return {
      access_token: this.config.access_token,
      expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async deletePost(_externalPostId: string): Promise<boolean> {
    return true;
  }
}
